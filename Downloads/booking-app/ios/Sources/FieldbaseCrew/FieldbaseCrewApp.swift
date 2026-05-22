import SwiftUI

@main
struct FieldbaseCrewApp: App {
  @State private var appState = AppState()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environment(appState)
        .preferredColorScheme(.light)
        .tint(Theme.amber)
    }
  }
}

struct RootView: View {
  @Environment(AppState.self) private var state

  var body: some View {
    Group {
      if state.user == nil {
        LoginView()
      } else if state.roleLoading || state.role == nil {
        loadingScreen
      } else {
        switch state.role! {
        case .manager:
          ManagerRootView()
        case .worker:
          NavigationStack {
            TodayView()
          }
        case .notLinked:
          NotLinkedView()
        }
      }
    }
    .animation(.easeInOut(duration: 0.2), value: state.user?.id)
  }

  private var loadingScreen: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ProgressView().tint(Theme.amber)
    }
  }
}

/// Користувач залогінений, але не пов'язаний ні з business ні з worker.
/// Перевіряємо чи є для нього pending invitations — даємо прийняти.
struct NotLinkedView: View {
  @Environment(AppState.self) private var state
  @State private var invitations: [PendingInvitation] = []
  @State private var loading = true
  @State private var accepting: UUID?
  @State private var error: String?

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(spacing: 16) {
          Image(systemName: "person.crop.circle.badge.questionmark")
            .font(.system(size: 56))
            .foregroundStyle(Theme.ink400)
            .padding(.top, 60)
          Text("Account not linked").font(.displayMedium).foregroundStyle(Theme.ink800)

          if loading {
            ProgressView().tint(Theme.amber).padding(.top, 20)
          } else if !invitations.isEmpty {
            VStack(spacing: 12) {
              Text("You've been invited:")
                .font(.caption).foregroundStyle(Theme.ink400)
              ForEach(invitations) { inv in
                InvitationCard(
                  invitation: inv,
                  accepting: accepting == inv.id,
                  onAccept: { Task { await accept(inv) } }
                )
              }
            }
            .padding(.horizontal, 20)
          } else {
            Text("No invitations found. Ask your manager to send you an invitation link, or set up your business at drevito.com.")
              .multilineTextAlignment(.center)
              .foregroundStyle(Theme.ink400)
              .padding(.horizontal, 32)
              .padding(.top, 8)
            Button(action: { Task { await loadInvitations() } }) {
              Text("Check again")
                .font(.caption).fontWeight(.medium)
                .padding(.horizontal, 16).padding(.vertical, 8)
                .background(Theme.amber).foregroundStyle(Theme.ink800).clipShape(Capsule())
            }
            .padding(.top, 8)
          }

          if let error {
            Text(error)
              .font(.caption)
              .foregroundStyle(.red)
              .padding(.horizontal, 24)
          }

          Button("Sign out") { state.signOut() }
            .padding(.top, 16)
            .foregroundStyle(Theme.ink600)
        }
      }
    }
    .task { await loadInvitations() }
  }

  private func loadInvitations() async {
    loading = true; defer { loading = false }
    do {
      let result = try await SupabaseService().pendingInvitations()
      await MainActor.run { self.invitations = result }
    } catch {
      // Тихо ігноруємо
    }
  }

  private func accept(_ inv: PendingInvitation) async {
    accepting = inv.id; error = nil
    defer { accepting = nil }
    do {
      let result = try await SupabaseService().acceptInvitation(token: inv.token)
      if result.success {
        // Перевикликаємо detect role щоб новий worker рядок підхопився
        await state.refreshRole()
      } else {
        self.error = result.error ?? "Could not accept invitation"
      }
    } catch {
      self.error = error.localizedDescription
    }
  }
}

private struct InvitationCard: View {
  let invitation: PendingInvitation
  let accepting: Bool
  let onAccept: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("INVITATION")
        .font(.caption2).tracking(1).foregroundStyle(Theme.amberDeep)
      Text(invitation.businessName).font(.displaySmall).foregroundStyle(Theme.ink800)
      Text(invitation.isManager ? "Join as manager" : "Join as \(invitation.role ?? "crew member")")
        .font(.caption).foregroundStyle(Theme.ink400)

      Button(action: onAccept) {
        HStack {
          if accepting { ProgressView().tint(Theme.ink800).scaleEffect(0.7) }
          Text(accepting ? "Joining…" : "Accept and join")
            .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 12)
        .background(Theme.amber).foregroundStyle(Theme.ink800).clipShape(Capsule())
      }
      .disabled(accepting)
      .padding(.top, 8)
    }
    .padding(16)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
  }
}
