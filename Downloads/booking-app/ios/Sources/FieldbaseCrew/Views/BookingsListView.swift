import SwiftUI

struct BookingsListView: View {
  @Environment(AppState.self) private var state
  @State private var filter: Filter = .upcoming
  @State private var allBookings: [BookingWithService] = []
  @State private var loading = false
  @State private var showNewBooking = false

  enum Filter: String, CaseIterable {
    case upcoming, today, past, all
    var label: String { rawValue.capitalized }
  }

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text("Bookings").font(.displayLarge).foregroundStyle(Theme.ink800)
          Text("Every job, ever.").foregroundStyle(Theme.ink400)

          // Filter chips
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
              ForEach(Filter.allCases, id: \.self) { f in
                Button {
                  filter = f
                  Task { await loadList() }
                } label: {
                  Text(f.label)
                    .font(.callout).fontWeight(.medium)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(filter == f ? Theme.ink800 : Color.white)
                    .foregroundStyle(filter == f ? Theme.ink50 : Theme.ink600)
                    .clipShape(Capsule())
                    .overlay(Capsule().strokeBorder(Theme.ink100))
                }
              }
            }
          }
          .padding(.top, 4)

          if loading && allBookings.isEmpty {
            ProgressView().padding(.top, 40)
          } else if allBookings.isEmpty {
            emptyState
          } else {
            ForEach(allBookings) { item in
              NavigationLink(value: item) {
                JobRow(item: item, client: clientFor(item))
              }
              .buttonStyle(.plain)
            }
          }
        }
        .padding(20)
      }
      .refreshable { await loadList() }

      // FAB
      VStack {
        Spacer()
        HStack {
          Spacer()
          Button {
            showNewBooking = true
          } label: {
            Image(systemName: "plus")
              .font(.system(size: 24, weight: .bold))
              .foregroundStyle(Theme.ink800)
              .frame(width: 56, height: 56)
              .background(Theme.amber)
              .clipShape(Circle())
              .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
          }
          .padding(.trailing, 20)
          .padding(.bottom, 20)
        }
      }
    }
    .navigationDestination(for: BookingWithService.self) { item in
      JobDetailView(item: item)
    }
    .sheet(isPresented: $showNewBooking, onDismiss: {
      Task { await loadList() }
    }) {
      NewBookingSheet()
    }
    .task { await loadList() }
  }

  private func clientFor(_ item: BookingWithService) -> Client? {
    guard let cid = item.booking.clientId else { return nil }
    return state.clientsById[cid]
  }

  private var emptyState: some View {
    VStack(spacing: 8) {
      Image(systemName: "calendar.badge.plus").font(.system(size: 48)).foregroundStyle(Theme.ink400)
      Text("Nothing here").font(.displayMedium).foregroundStyle(Theme.ink800)
      Text("No bookings match those filters.").foregroundStyle(Theme.ink400)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 20))
  }

  // Завантажуємо bookings за фільтром. У AppState вже є логіка для today —
  // тут ми робимо ширший запит безпосередньо через SupabaseService.
  private func loadList() async {
    guard let business = state.role?.business else { return }
    loading = true; defer { loading = false }

    let cal = Calendar.current
    let now = Date()
    let from: Date
    let until: Date

    switch filter {
    case .upcoming:
      from = now
      until = cal.date(byAdding: .day, value: 90, to: now) ?? now
    case .today:
      from = cal.startOfDay(for: now)
      until = cal.date(byAdding: .day, value: 1, to: from) ?? from
    case .past:
      from = cal.date(byAdding: .day, value: -365, to: now) ?? now
      until = now
    case .all:
      from = cal.date(byAdding: .day, value: -365, to: now) ?? now
      until = cal.date(byAdding: .day, value: 365, to: now) ?? now
    }

    let service = SupabaseService()
    do {
      let workerId: UUID? = state.role?.isManager == true ? nil : state.role?.worker?.id
      let bookings = try await service.bookings(
        businessId: business.id,
        workerId: workerId,
        from: from,
        until: until
      )
      // Долучити клієнтів
      let clientIds = Array(Set(bookings.compactMap { $0.booking.clientId }))
      let clients = try await service.clients(ids: clientIds)
      await MainActor.run {
        self.allBookings = bookings
        // Об'єднуємо з тим що вже є в state — щоб ClientFor лукапи знаходили клієнтів
        var merged = state.clientsById
        for (k, v) in clients { merged[k] = v }
        state.clientsById = merged
      }
    } catch {
      // Помилку показуємо через state
      await MainActor.run { state.errorMessage = error.localizedDescription }
    }
  }
}
