import SwiftUI

/// "More" tab — links to Clients/Services/Schedule + Account section with sign out.
struct MoreView: View {
  @Environment(AppState.self) private var state

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          VStack(alignment: .leading, spacing: 4) {
            Text("More").font(.displayLarge).foregroundStyle(Theme.ink800)
            if let business = state.role?.business {
              Text(business.name).foregroundStyle(Theme.ink400)
            }
          }

          // Working features
          VStack(spacing: 0) {
            sectionHeader("Manage")
            NavigationLink(destination: ClientsListView()) {
              rowContent(icon: "person.crop.circle", title: "Clients", subtitle: "Search clients and view history")
            }
            Divider().padding(.leading, 14)
            NavigationLink(destination: ServicesListView()) {
              rowContent(icon: "wrench.and.screwdriver", title: "Services", subtitle: "View your service menu")
            }
            Divider().padding(.leading, 14)
            NavigationLink(destination: ScheduleView()) {
              rowContent(icon: "clock", title: "Working hours", subtitle: "When customers can book", last: true)
            }
          }
          .background(.white)
          .clipShape(RoundedRectangle(cornerRadius: 16))
          .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))

          // Web link card
          if let business = state.role?.business {
            VStack(alignment: .leading, spacing: 8) {
              HStack {
                Image(systemName: "globe").foregroundStyle(Theme.amber)
                Text("Edit on the web").font(.callout).fontWeight(.semibold)
              }
              Text("Add or edit services, schedule, public profile, and integrations at drevito.com.")
                .font(.caption).foregroundStyle(Theme.ink400)
              HStack(spacing: 12) {
                Link(destination: URL(string: "https://drevito.com/app/settings")!) {
                  HStack(spacing: 4) {
                    Text("Open Settings").font(.caption).fontWeight(.medium)
                    Image(systemName: "arrow.up.right").font(.caption2)
                  }
                  .foregroundStyle(Theme.ink700)
                }
                Link(destination: URL(string: "https://drevito.com/book/\(business.slug)")!) {
                  HStack(spacing: 4) {
                    Text("Booking page").font(.caption).fontWeight(.medium)
                    Image(systemName: "arrow.up.right").font(.caption2)
                  }
                  .foregroundStyle(Theme.ink700)
                }
              }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.amber.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
          }

          // Account
          VStack(spacing: 0) {
            sectionHeader("Account")
            HStack {
              Image(systemName: "envelope").foregroundStyle(Theme.ink400).frame(width: 24)
              Text(state.user?.email ?? "—").foregroundStyle(Theme.ink800)
              Spacer()
            }
            .padding(14)
            if let role = state.role {
              Divider().padding(.leading, 14)
              HStack {
                Image(systemName: role.isManager ? "person.fill.checkmark" : "person.fill")
                  .foregroundStyle(Theme.ink400).frame(width: 24)
                Text(role.isManager ? "Manager" : "Worker").foregroundStyle(Theme.ink800)
                Spacer()
              }
              .padding(14)
            }
            Divider().padding(.leading, 14)
            Button {
              state.signOut()
            } label: {
              HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right").foregroundStyle(.red).frame(width: 24)
                Text("Sign out").foregroundStyle(.red)
                Spacer()
              }
              .padding(14)
            }
          }
          .background(.white)
          .clipShape(RoundedRectangle(cornerRadius: 16))
          .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
        }
        .padding(20)
      }
    }
  }

  private func sectionHeader(_ title: String) -> some View {
    HStack {
      Text(title.uppercased())
        .font(.caption2).tracking(1).foregroundStyle(Theme.ink400)
        .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 6)
      Spacer()
    }
  }

  private func rowContent(icon: String, title: String, subtitle: String, last: Bool = false) -> some View {
    HStack {
      Image(systemName: icon).foregroundStyle(Theme.ink600).frame(width: 24)
      VStack(alignment: .leading, spacing: 2) {
        Text(title).foregroundStyle(Theme.ink800)
        Text(subtitle).font(.caption).foregroundStyle(Theme.ink400)
      }
      Spacer()
      Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(Theme.ink300)
    }
    .padding(14)
    .contentShape(Rectangle())
  }
}
