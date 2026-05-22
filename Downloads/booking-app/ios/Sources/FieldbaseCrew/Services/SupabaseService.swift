import Foundation
import Supabase

/// Доступ до даних через Supabase Postgres + RLS.
/// Розширений набір — Phase 2 (паритет з вебом):
/// roles, bookings CRUD, clients CRUD, services read, schedule read,
/// leads list+update+convert, worker invitations create+accept+cancel.
struct SupabaseService {
  private var client: SupabaseClient { SupabaseClientProvider.shared }

  // MARK: - Role detection

  func detectRole(userId: UUID) async throws -> UserRole {
    let ownedBusinesses: [Business] = try await client
      .from("businesses")
      .select()
      .eq("owner_id", value: userId)
      .limit(1)
      .execute()
      .value

    if let business = ownedBusinesses.first {
      let myWorkers: [Worker] = try await client
        .from("workers")
        .select()
        .eq("business_id", value: business.id)
        .eq("user_id", value: userId)
        .limit(1)
        .execute()
        .value
      return .manager(business: business, worker: myWorkers.first)
    }

    let myWorkers: [Worker] = try await client
      .from("workers")
      .select()
      .eq("user_id", value: userId)
      .limit(1)
      .execute()
      .value

    guard let worker = myWorkers.first else {
      return .notLinked
    }

    let businesses: [Business] = try await client
      .from("businesses")
      .select()
      .eq("id", value: worker.businessId)
      .limit(1)
      .execute()
      .value

    guard let business = businesses.first else {
      return .notLinked
    }

    return worker.isManager
      ? .manager(business: business, worker: worker)
      : .worker(business: business, worker: worker)
  }

  // MARK: - Bookings

  func bookings(
    businessId: UUID,
    workerId: UUID? = nil,
    from: Date,
    until: Date
  ) async throws -> [BookingWithService] {
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    var query = client
      .from("bookings")
      .select()
      .eq("business_id", value: businessId)
      .gte("start_at", value: iso.string(from: from))
      .lt("start_at",  value: iso.string(from: until))

    if let wid = workerId {
      query = query.contains("worker_ids", value: [wid.uuidString])
    }

    let bookings: [Booking] = try await query
      .order("start_at", ascending: true)
      .execute()
      .value

    let svcIds = Array(Set(bookings.compactMap { $0.serviceId?.uuidString }))
    var nameById: [UUID: String] = [:]
    if !svcIds.isEmpty {
      struct SvcRow: Codable { let id: UUID; let name: String }
      let svcs: [SvcRow] = try await client
        .from("services")
        .select("id,name")
        .in("id", values: svcIds)
        .execute()
        .value
      for s in svcs { nameById[s.id] = s.name }
    }

    return bookings.map { b in
      BookingWithService(booking: b, serviceName: b.serviceId.flatMap { nameById[$0] })
    }
  }

  func updateBookingStatus(id: UUID, status: BookingStatus, notes: String?) async throws {
    struct Patch: Encodable {
      let status: String
      let notes: String?
    }
    try await client
      .from("bookings")
      .update(Patch(status: status.rawValue, notes: notes))
      .eq("id", value: id)
      .execute()
  }

  func updateBookingTime(id: UUID, startAt: Date, endAt: Date) async throws {
    struct Patch: Encodable {
      let start_at: String
      let end_at: String
    }
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    try await client
      .from("bookings")
      .update(Patch(start_at: iso.string(from: startAt), end_at: iso.string(from: endAt)))
      .eq("id", value: id)
      .execute()
  }

  func updateBookingWorkers(id: UUID, workerIds: [UUID]) async throws {
    struct Patch: Encodable { let worker_ids: [String] }
    try await client
      .from("bookings")
      .update(Patch(worker_ids: workerIds.map { $0.uuidString }))
      .eq("id", value: id)
      .execute()
  }

  /// Оновити ціну booking вручну (для custom quotes).
  func updateBookingPrice(id: UUID, price: Double) async throws {
    struct Patch: Encodable { let price: Double }
    try await client
      .from("bookings")
      .update(Patch(price: price))
      .eq("id", value: id)
      .execute()
  }

  /// Оновити всі редаговані поля booking одним запитом.
  func updateBookingDetails(
    id: UUID,
    price: Double,
    tip: Double,
    address: String?,
    notes: String?,
    status: BookingStatus,
    workerIds: [UUID]
  ) async throws {
    struct Patch: Encodable {
      let price: Double
      let tip: Double
      let address: String?
      let notes: String?
      let status: String
      let worker_ids: [String]
    }
    try await client
      .from("bookings")
      .update(Patch(
        price: price,
        tip: tip,
        address: address,
        notes: notes,
        status: status.rawValue,
        worker_ids: workerIds.map { $0.uuidString }
      ))
      .eq("id", value: id)
      .execute()
  }

  func deleteBooking(id: UUID) async throws {
    try await client
      .from("bookings")
      .delete()
      .eq("id", value: id)
      .execute()
  }

  func createBooking(
    businessId: UUID,
    existingClientId: UUID?,
    newClient: (name: String, phone: String?, address: String?)?,
    serviceId: UUID,
    workerIds: [UUID],
    startAt: Date,
    durationMin: Int,
    price: Double,
    notes: String?
  ) async throws -> UUID {
    var clientId = existingClientId

    if clientId == nil, let nc = newClient {
      struct NewClient: Encodable {
        let business_id: UUID
        let name: String
        let phone: String?
        let address: String?
      }
      struct ClientRow: Decodable { let id: UUID }
      let payload = NewClient(business_id: businessId, name: nc.name, phone: nc.phone, address: nc.address)
      let inserted: [ClientRow] = try await client
        .from("clients")
        .insert(payload)
        .select("id")
        .execute()
        .value
      clientId = inserted.first?.id
    }

    struct NewBooking: Encodable {
      let business_id: UUID
      let client_id: UUID?
      let service_id: UUID
      let worker_ids: [String]
      let start_at: String
      let end_at: String
      let address: String?
      let price: Double
      let notes: String?
      let status: String
    }
    struct BookingRow: Decodable { let id: UUID }

    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    let endAt = Calendar.current.date(byAdding: .minute, value: durationMin, to: startAt) ?? startAt
    let address = newClient?.address

    let booking = NewBooking(
      business_id: businessId,
      client_id: clientId,
      service_id: serviceId,
      worker_ids: workerIds.map { $0.uuidString },
      start_at: iso.string(from: startAt),
      end_at: iso.string(from: endAt),
      address: address,
      price: price,
      notes: notes,
      status: "scheduled"
    )

    let inserted: [BookingRow] = try await client
      .from("bookings")
      .insert(booking)
      .select("id")
      .execute()
      .value

    return inserted.first?.id ?? UUID()
  }

  // MARK: - Clients

  func clients(ids: [UUID]) async throws -> [UUID: Client] {
    guard !ids.isEmpty else { return [:] }
    let rows: [Client] = try await client
      .from("clients")
      .select()
      .in("id", values: ids.map { $0.uuidString })
      .execute()
      .value
    return Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0) })
  }

  func allClients(businessId: UUID) async throws -> [Client] {
    try await client
      .from("clients")
      .select()
      .eq("business_id", value: businessId)
      .order("name", ascending: true)
      .execute()
      .value
  }

  func clientById(_ id: UUID) async throws -> Client? {
    let rows: [Client] = try await client
      .from("clients")
      .select()
      .eq("id", value: id)
      .limit(1)
      .execute()
      .value
    return rows.first
  }

  func bookingsForClient(_ clientId: UUID) async throws -> [BookingWithService] {
    let bookings: [Booking] = try await client
      .from("bookings")
      .select()
      .eq("client_id", value: clientId)
      .order("start_at", ascending: false)
      .execute()
      .value

    let svcIds = Array(Set(bookings.compactMap { $0.serviceId?.uuidString }))
    var nameById: [UUID: String] = [:]
    if !svcIds.isEmpty {
      struct SvcRow: Codable { let id: UUID; let name: String }
      let svcs: [SvcRow] = try await client
        .from("services")
        .select("id,name")
        .in("id", values: svcIds)
        .execute()
        .value
      for s in svcs { nameById[s.id] = s.name }
    }
    return bookings.map { BookingWithService(booking: $0, serviceName: $0.serviceId.flatMap { nameById[$0] }) }
  }

  func updateClient(id: UUID, name: String, phone: String?, email: String?, address: String?, notes: String?) async throws {
    struct Patch: Encodable {
      let name: String
      let phone: String?
      let email: String?
      let address: String?
      let notes: String?
    }
    try await client
      .from("clients")
      .update(Patch(name: name, phone: phone, email: email, address: address, notes: notes))
      .eq("id", value: id)
      .execute()
  }

  // MARK: - Services

  func allServices(businessId: UUID) async throws -> [Service] {
    try await client
      .from("services")
      .select()
      .eq("business_id", value: businessId)
      .eq("active", value: true)
      .order("name", ascending: true)
      .execute()
      .value
  }

  // MARK: - Workers

  func allWorkers(businessId: UUID) async throws -> [Worker] {
    try await client
      .from("workers")
      .select()
      .eq("business_id", value: businessId)
      .order("name", ascending: true)
      .execute()
      .value
  }

  func setWorkerIsManager(workerId: UUID, isManager: Bool) async throws {
    struct Patch: Encodable { let is_manager: Bool }
    try await client
      .from("workers")
      .update(Patch(is_manager: isManager))
      .eq("id", value: workerId)
      .execute()
  }

  func deleteWorker(id: UUID) async throws {
    try await client
      .from("workers")
      .delete()
      .eq("id", value: id)
      .execute()
  }

  // MARK: - Worker invitations

  func pendingInvitations() async throws -> [PendingInvitation] {
    try await client
      .rpc("my_pending_invitations")
      .execute()
      .value
  }

  func acceptInvitation(token: String) async throws -> AcceptInvitationResult {
    let result: AcceptInvitationResult = try await client
      .rpc("accept_invitation", params: ["invitation_token": token])
      .execute()
      .value
    return result
  }

  /// Create new invitation (manager). Generates token, returns it for sharing.
  func createInvitation(
    businessId: UUID,
    email: String,
    name: String?,
    role: String,
    isManager: Bool
  ) async throws -> WorkerInvitation {
    let token = randomToken()
    struct NewInvite: Encodable {
      let business_id: UUID
      let email: String
      let name: String?
      let role: String
      let is_manager: Bool
      let token: String
    }
    let payload = NewInvite(
      business_id: businessId,
      email: email.lowercased(),
      name: name,
      role: role,
      is_manager: isManager,
      token: token
    )
    let inserted: [WorkerInvitation] = try await client
      .from("worker_invitations")
      .insert(payload)
      .select()
      .execute()
      .value
    guard let inv = inserted.first else {
      throw NSError(domain: "Drevito", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create invitation"])
    }
    return inv
  }

  /// Get pending invitations for the manager's business (to display on Crew screen)
  func pendingInvitationsForBusiness(_ businessId: UUID) async throws -> [WorkerInvitation] {
    try await client
      .from("worker_invitations")
      .select()
      .eq("business_id", value: businessId)
      .eq("status", value: "pending")
      .order("created_at", ascending: false)
      .execute()
      .value
  }

  func cancelInvitation(id: UUID) async throws {
    struct Patch: Encodable { let status: String }
    try await client
      .from("worker_invitations")
      .update(Patch(status: "cancelled"))
      .eq("id", value: id)
      .execute()
  }

  // MARK: - Leads (Inbox)

  func leads(businessId: UUID, status: LeadStatus? = nil) async throws -> [Lead] {
    var query = client
      .from("lead_requests")
      .select()
      .eq("business_id", value: businessId)
    if let s = status {
      query = query.eq("status", value: s.rawValue)
    }
    return try await query
      .order("created_at", ascending: false)
      .execute()
      .value
  }

  func updateLeadStatus(id: UUID, status: LeadStatus) async throws {
    struct Patch: Encodable { let status: String }
    try await client
      .from("lead_requests")
      .update(Patch(status: status.rawValue))
      .eq("id", value: id)
      .execute()
  }

  /// Mark lead as converted and link to booking.
  func linkLeadToBooking(leadId: UUID, bookingId: UUID) async throws {
    struct Patch: Encodable {
      let status: String
      let booking_id: UUID
    }
    try await client
      .from("lead_requests")
      .update(Patch(status: "converted", booking_id: bookingId))
      .eq("id", value: leadId)
      .execute()
  }

  func newLeadsCount(businessId: UUID) async throws -> Int {
    let leads: [Lead] = try await client
      .from("lead_requests")
      .select()
      .eq("business_id", value: businessId)
      .eq("status", value: "new")
      .execute()
      .value
    return leads.count
  }

  // MARK: - Helpers

  private func randomToken() -> String {
    let chars = "abcdef0123456789"
    return String((0..<48).map { _ in chars.randomElement()! })
  }
}

/// Зручна обгортка коли треба booking + serviceName разом.
struct BookingWithService: Identifiable, Hashable {
  let booking: Booking
  let serviceName: String?

  var id: UUID { booking.id }
}

/// Запис invitation для відображення в UI.
struct PendingInvitation: Identifiable, Codable, Hashable {
  let id: UUID
  let businessId: UUID
  let businessName: String
  let businessSlug: String
  let token: String
  let role: String?
  let isManager: Bool
  let expiresAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case businessId    = "business_id"
    case businessName  = "business_name"
    case businessSlug  = "business_slug"
    case token
    case role
    case isManager     = "is_manager"
    case expiresAt     = "expires_at"
  }
}

struct AcceptInvitationResult: Codable {
  let success: Bool
  let error: String?
  let workerId: UUID?
  let businessId: UUID?

  enum CodingKeys: String, CodingKey {
    case success, error
    case workerId   = "worker_id"
    case businessId = "business_id"
  }
}
