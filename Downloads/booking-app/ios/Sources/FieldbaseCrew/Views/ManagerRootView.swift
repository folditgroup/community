import SwiftUI

/// Tab bar для manager mode. 5 tabs:
///   - Today: сьогоднішні bookings
///   - Inbox: leads з AI чату (badge показує new count)
///   - Bookings: всі з фільтрами + create button
///   - Crew: workers + invitations
///   - More: Clients/Services/Schedule/Settings/Sign out
struct ManagerRootView: View {
  @Environment(AppState.self) private var state
  @State private var selectedTab: Tab = .today
  @State private var newLeadsCount: Int = 0

  enum Tab: Hashable { case today, inbox, bookings, crew, more }

  var body: some View {
    TabView(selection: $selectedTab) {
      NavigationStack {
        TodayView()
      }
      .tabItem { Label("Today", systemImage: "sun.max") }
      .tag(Tab.today)

      NavigationStack {
        InboxView()
      }
      .tabItem { Label("Inbox", systemImage: "tray") }
      .badge(newLeadsCount > 0 ? newLeadsCount : 0)
      .tag(Tab.inbox)

      NavigationStack {
        BookingsListView()
      }
      .tabItem { Label("Bookings", systemImage: "calendar") }
      .tag(Tab.bookings)

      NavigationStack {
        CrewView()
      }
      .tabItem { Label("Crew", systemImage: "person.2") }
      .tag(Tab.crew)

      NavigationStack {
        MoreView()
      }
      .tabItem { Label("More", systemImage: "ellipsis.circle") }
      .tag(Tab.more)
    }
    .tint(Theme.amber)
    .task {
      await refreshLeadCount()
    }
    .onChange(of: selectedTab) { _, _ in
      Task { await refreshLeadCount() }
    }
  }

  private func refreshLeadCount() async {
    guard let bid = state.role?.business?.id else { return }
    do {
      let count = try await SupabaseService().newLeadsCount(businessId: bid)
      await MainActor.run { self.newLeadsCount = count }
    } catch {
      // silent
    }
  }
}
