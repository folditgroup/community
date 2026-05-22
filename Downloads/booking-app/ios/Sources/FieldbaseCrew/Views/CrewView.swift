import SwiftUI
import UIKit

/// Менеджмент команди (тільки для Manager mode).
/// Manager може: invite по email, cancel invitation, toggle manager rights, видалити worker.
struct CrewView: View {
  @Environment(AppState.self) private var state

  @State private var showInviteSheet = false
  @State private var pendingInvitations: [WorkerInvitation] = []
  @State private var refreshTrigger = 0

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          HStack {
            VStack(alignment: .leading, spacing: 2) {
              Text("Crew").font(.displayLarge).foregroundStyle(Theme.ink800)
              Text("Your team. Invite by email.")
                .font(.caption)
                .foregroundStyle(Theme.ink400)
            }
            Spacer()
            Button(action: { showInviteSheet = true }) {
              HStack(spacing: 4) {
                Image(systemName: "paperplane.fill")
                Text("Invite").fontWeight(.semibold)
              }
              .font(.subheadline)
              .padding(.horizontal, 12).padding(.vertical, 8)
              .background(Theme.amber)
              .foregroundStyle(Theme.ink800)
              .clipShape(Capsule())
            }
          }

          // Pending invitations
          if !pendingInvitations.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
              Text("PENDING INVITATIONS")
                .font(.caption2.weight(.bold))
                .tracking(1)
                .foregroundStyle(Theme.ink400)
              ForEach(pendingInvitations) { inv in
                pendingInvitationRow(inv)
              }
            }
            .padding(.bottom, 8)
          }

          if state.workers.isEmpty && pendingInvitations.isEmpty {
            empty
          } else {
            ForEach(state.workers) { w in
              WorkerCard(worker: w)
            }
          }
        }
        .padding(20)
      }
      .refreshable {
        await state.refresh()
        await loadInvitations()
      }
    }
    .task(id: refreshTrigger) {
      await state.refresh()
      await loadInvitations()
    }
    .sheet(isPresented: $showInviteSheet) {
      if let bid = state.role?.business?.id {
        InviteWorkerSheet(businessId: bid, onCreated: { refreshTrigger += 1 })
      }
    }
  }

  private var empty: some View {
    VStack(spacing: 8) {
      Image(systemName: "person.2").font(.system(size: 48)).foregroundStyle(Theme.ink400)
      Text("No crew yet").font(.displayMedium).foregroundStyle(Theme.ink800)
      Text("Tap Invite to add your first worker.")
        .multilineTextAlignment(.center)
        .foregroundStyle(Theme.ink400)
        .padding(.horizontal, 16)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 20))
  }

  private func pendingInvitationRow(_ inv: WorkerInvitation) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 3) {
        Text(inv.name ?? inv.email)
          .font(.body.weight(.semibold))
          .foregroundStyle(Theme.ink800)
        Text(inv.email)
          .font(.caption)
          .foregroundStyle(Theme.ink500)
        if inv.isManager {
          Text("MANAGER")
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 5).padding(.vertical, 2)
            .background(Theme.amberSoft)
            .foregroundStyle(Theme.amberDeep)
            .clipShape(Capsule())
        }
      }
      Spacer()

      Button(action: {
        let link = "https://drevito.com/join/\(inv.token)"
        UIPasteboard.general.string = link
      }) {
        HStack(spacing: 4) {
          Image(systemName: "doc.on.doc")
          Text("Copy").font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Theme.ink800)
        .foregroundStyle(Theme.ink50)
        .clipShape(Capsule())
      }

      Button(action: { Task { await cancelInvitation(inv) } }) {
        Image(systemName: "xmark.circle.fill")
          .font(.title3)
          .foregroundStyle(Theme.ink300)
      }
    }
    .padding(12)
    .background(Theme.amberSoft.opacity(0.4))
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.amber.opacity(0.4)))
  }

  private func loadInvitations() async {
    guard let bid = state.role?.business?.id else { return }
    do {
      let result = try await SupabaseService().pendingInvitationsForBusiness(bid)
      await MainActor.run { self.pendingInvitations = result }
    } catch {
      print("invitations load error:", error)
    }
  }

  private func cancelInvitation(_ inv: WorkerInvitation) async {
    do {
      try await SupabaseService().cancelInvitation(id: inv.id)
      await loadInvitations()
    } catch {
      print("cancel error:", error)
    }
  }
}

private struct WorkerCard: View {
  let worker: Worker
  @Environment(AppState.self) private var state
  @State private var updating = false

  private var isOwner: Bool {
    guard let business = state.role?.business else { return false }
    return worker.userId == business.ownerId
  }

  private var canToggle: Bool {
    state.role?.isManager == true && !isOwner
  }

  var body: some View {
    HStack(spacing: 14) {
      ZStack {
        Circle().fill(Theme.ink800)
        Text(initials).foregroundStyle(Theme.amber).font(.callout).fontWeight(.semibold)
      }
      .frame(width: 44, height: 44)

      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 6) {
          Text(worker.name).font(.callout).fontWeight(.semibold).foregroundStyle(Theme.ink800)
          if worker.isManager {
            Text(isOwner ? "OWNER" : "MANAGER")
              .font(.caption2).fontWeight(.bold)
              .padding(.horizontal, 6).padding(.vertical, 2)
              .background(Theme.amber.opacity(0.2))
              .foregroundStyle(Theme.ink700)
              .clipShape(Capsule())
          }
        }
        if let role = worker.role, !role.isEmpty {
          Text(role).font(.caption).foregroundStyle(Theme.ink400)
        }
        if let phone = worker.phone, !phone.isEmpty {
          Button(action: { call(phone) }) {
            HStack(spacing: 3) {
              Image(systemName: "phone.fill").font(.caption2)
              Text(phone)
            }
            .font(.caption).foregroundStyle(Theme.amberDeep)
          }
        }
      }
      Spacer()

      if canToggle {
        if updating {
          ProgressView().scaleEffect(0.8)
        } else {
          Toggle("", isOn: Binding(
            get: { worker.isManager },
            set: { newValue in
              Task {
                updating = true
                await state.setWorkerIsManager(worker, isManager: newValue)
                updating = false
              }
            }
          ))
          .labelsHidden()
          .tint(Theme.amber)
        }
      }
    }
    .padding(14)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
  }

  private var initials: String {
    let parts = worker.name.split(separator: " ")
    let first = parts.first?.first.map(String.init) ?? ""
    let last  = parts.dropFirst().first?.first.map(String.init) ?? ""
    return (first + last).uppercased()
  }

  private func call(_ phone: String) {
    if let url = URL(string: "tel://\(phone.filter { !$0.isWhitespace })") {
      UIApplication.shared.open(url)
    }
  }
}
