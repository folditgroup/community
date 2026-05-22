import SwiftUI

struct TodayView: View {
  @Environment(AppState.self) private var state

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          header
          if state.bookings.isEmpty {
            empty
          } else {
            ForEach(state.bookings) { item in
              NavigationLink(value: item) {
                JobRow(item: item, client: clientFor(item))
              }
              .buttonStyle(.plain)
            }
          }
        }
        .padding(20)
      }
      .refreshable { await state.refresh() }
    }
    .navigationDestination(for: BookingWithService.self) { item in
      JobDetailView(item: item)
    }
    // Worker mode — окреме меню для sign out (manager має tab bar)
    .toolbar {
      if state.role?.isManager == false {
        ToolbarItem(placement: .topBarTrailing) {
          Menu {
            Button("Refresh") { Task { await state.refresh() } }
            Button("Sign out", role: .destructive) { state.signOut() }
          } label: {
            Image(systemName: "ellipsis.circle").foregroundStyle(Theme.ink600)
          }
        }
      }
    }
    .task { await state.refresh() }
  }

  private func clientFor(_ item: BookingWithService) -> Client? {
    guard let cid = item.booking.clientId else { return nil }
    return state.clientsById[cid]
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(todayLabel.uppercased()).font(.caption).tracking(1).foregroundStyle(Theme.ink400)
      Text("Today").font(.displayLarge).foregroundStyle(Theme.ink800)
      if state.role?.isManager == true {
        if let business = state.role?.business {
          Text("\(business.name) — \(state.bookings.count) job\(state.bookings.count == 1 ? "" : "s") today.")
            .foregroundStyle(Theme.ink400)
        }
        earningsLine
      } else if let worker = state.role?.worker {
        Text("Hey \(worker.name.components(separatedBy: " ").first ?? worker.name) — \(state.bookings.count) job\(state.bookings.count == 1 ? "" : "s") on you.")
          .foregroundStyle(Theme.ink400)
      }
    }
  }

  private var empty: some View {
    VStack(spacing: 8) {
      Image(systemName: "checkmark.circle").font(.system(size: 48)).foregroundStyle(Theme.moss)
      Text(state.role?.isManager == true ? "No jobs today." : "Clear day.")
        .font(.displayMedium).foregroundStyle(Theme.ink800)
      Text(state.role?.isManager == true ? "Nothing scheduled across the team." : "Nothing scheduled.")
        .foregroundStyle(Theme.ink400)
    }
    .frame(maxWidth: .infinity).padding(.vertical, 60)
    .background(.white).clipShape(RoundedRectangle(cornerRadius: 20))
  }

  // Managers only — today's earnings (revenue + tips).
  private var earningsLine: some View {
    let revenue = state.bookings.reduce(0) { $0 + $1.booking.price }
    let tips = state.bookings.reduce(0) { $0 + $1.booking.tip }
    let earnings = revenue + tips
    return HStack(spacing: 8) {
      Image(systemName: "dollarsign.circle.fill").foregroundStyle(Theme.amberDeep)
      Text(money(earnings)).fontWeight(.semibold).foregroundStyle(Theme.ink800)
      if tips > 0 {
        Text("incl. \(money(tips)) tips").font(.caption).foregroundStyle(Theme.ink400)
      }
      Spacer()
    }
    .padding(.top, 4)
  }

  private func money(_ v: Double) -> String { String(format: "$%.0f", v) }

  private var todayLabel: String {
    let f = DateFormatter(); f.dateFormat = "EEEE, MMM d"
    return f.string(from: Date())
  }
}
