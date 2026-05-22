import Foundation
import Observation
import Supabase

struct CurrentUser: Equatable {
  let id: UUID
  let email: String?
}

@Observable
final class AppState {
  // Auth
  var user: CurrentUser?
  var role: UserRole?
  var roleLoading = false

  // Дані (контекст залежить від role)
  var bookings: [BookingWithService] = []
  var clientsById: [UUID: Client] = [:]
  var workers: [Worker] = []
  var services: [Service] = []

  var errorMessage: String?
  var isLoading = false

  private let auth = AuthService()
  private let data = SupabaseService()
  private var authTask: Task<Void, Never>?

  init() {
    // Слухаємо auth state changes
    authTask = Task { [weak self] in
      for await change in SupabaseClientProvider.shared.auth.authStateChanges {
        guard let self else { return }
        if let session = change.session {
          await MainActor.run {
            self.user = CurrentUser(id: session.user.id, email: session.user.email)
          }
          await self.resolveRoleAndLoad()
        } else {
          await MainActor.run {
            self.user = nil
            self.role = nil
            self.bookings = []
            self.clientsById = [:]
            self.workers = []
            self.services = []
          }
        }
      }
    }
  }

  deinit { authTask?.cancel() }

  // MARK: - Auth actions

  func signIn(email: String, password: String) async {
    isLoading = true; defer { isLoading = false }
    do {
      try await auth.signIn(email: email, password: password)
      errorMessage = nil
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func signOut() {
    Task {
      try? await auth.signOut()
    }
  }

  // MARK: - Role + initial data

  /// Публічний метод для перевикликання role detection.
  /// Викликати після accept_invitation, або коли треба переоновити роль.
  func refreshRole() async {
    await resolveRoleAndLoad()
  }

  private func resolveRoleAndLoad() async {
    guard let uid = user?.id else { return }
    await MainActor.run { self.roleLoading = true }
    defer { Task { @MainActor in self.roleLoading = false } }

    do {
      let role = try await data.detectRole(userId: uid)
      await MainActor.run { self.role = role }
      await refresh()
    } catch {
      await MainActor.run {
        self.errorMessage = error.localizedDescription
        self.role = .notLinked
      }
    }
  }

  /// Завантажує дані відповідно до ролі. Викликається при логіні, pull-to-refresh, tab switch.
  func refresh() async {
    guard let role = role else { return }
    guard let business = role.business else { return }

    let cal = Calendar.current
    let startOfDay = cal.startOfDay(for: Date())
    let endOfDay = cal.date(byAdding: .day, value: 1, to: startOfDay) ?? startOfDay

    do {
      let workerId: UUID? = role.isManager ? nil : role.worker?.id

      // 1. Сьогоднішні bookings
      async let bookingsTask = data.bookings(
        businessId: business.id,
        workerId: workerId,
        from: startOfDay,
        until: endOfDay
      )

      let bookings = try await bookingsTask

      // 2. Клієнти для bookings
      let clientIds = Array(Set(bookings.compactMap { $0.booking.clientId }))
      async let clientsTask = data.clients(ids: clientIds)

      // 3. Для manager — додатково всі workers і services (потрібні для CRUD)
      var allWorkers: [Worker] = []
      var allServices: [Service] = []
      if role.isManager {
        async let workersTask = data.allWorkers(businessId: business.id)
        async let servicesTask = data.allServices(businessId: business.id)
        allWorkers = try await workersTask
        allServices = try await servicesTask
      }

      let clientsMap = try await clientsTask

      await MainActor.run {
        self.bookings = bookings
        self.clientsById = clientsMap
        self.workers = allWorkers
        self.services = allServices
      }
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
    }
  }

  // MARK: - Booking actions

  func setStatus(_ bws: BookingWithService, status: BookingStatus, notes: String?) async {
    do {
      try await data.updateBookingStatus(id: bws.booking.id, status: status, notes: notes)
      await refresh()
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
    }
  }

  /// Оновити всі редаговані поля booking (ціна, адреса, нотатки, статус, crew).
  func updateBookingDetails(
    _ bws: BookingWithService,
    price: Double,
    tip: Double,
    address: String?,
    notes: String?,
    status: BookingStatus,
    workerIds: [UUID]
  ) async -> Bool {
    do {
      try await data.updateBookingDetails(
        id: bws.booking.id,
        price: price,
        tip: tip,
        address: address,
        notes: notes,
        status: status,
        workerIds: workerIds
      )
      await refresh()
      return true
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
      return false
    }
  }

  func deleteBooking(_ bws: BookingWithService) async {
    do {
      try await data.deleteBooking(id: bws.booking.id)
      await refresh()
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
    }
  }

  func createBooking(
    existingClientId: UUID?,
    newClient: (name: String, phone: String?, address: String?)?,
    serviceId: UUID,
    workerIds: [UUID],
    startAt: Date,
    durationMin: Int,
    price: Double,
    notes: String?
  ) async -> Bool {
    guard let business = role?.business else { return false }
    do {
      _ = try await data.createBooking(
        businessId: business.id,
        existingClientId: existingClientId,
        newClient: newClient,
        serviceId: serviceId,
        workerIds: workerIds,
        startAt: startAt,
        durationMin: durationMin,
        price: price,
        notes: notes
      )
      await refresh()
      return true
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
      return false
    }
  }

  // MARK: - Worker management (Manager only)

  func setWorkerIsManager(_ worker: Worker, isManager: Bool) async {
    do {
      try await data.setWorkerIsManager(workerId: worker.id, isManager: isManager)
      await refresh()
    } catch {
      await MainActor.run { self.errorMessage = error.localizedDescription }
    }
  }
}
