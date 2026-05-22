import SwiftUI
import UIKit

/// Sheet для створення invitation. Manager вводить email, ім'я, role.
/// Після створення показуємо share-link який можна копіювати або поділитися.
struct InviteWorkerSheet: View {
  let businessId: UUID
  let onCreated: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var email = ""
  @State private var name = ""
  @State private var role = "Crew"
  @State private var isManager = false
  @State private var busy = false
  @State private var error: String?
  @State private var createdInvitation: WorkerInvitation?

  var body: some View {
    NavigationStack {
      Group {
        if let inv = createdInvitation {
          successView(inv)
        } else {
          formView
        }
      }
      .navigationTitle(createdInvitation == nil ? "Invite worker" : "Invitation ready")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button(createdInvitation == nil ? "Cancel" : "Done") { dismiss() }
        }
        if createdInvitation == nil {
          ToolbarItem(placement: .confirmationAction) {
            Button(busy ? "Creating…" : "Create") { Task { await create() } }
              .disabled(busy || email.isEmpty)
          }
        }
      }
    }
  }

  private var formView: some View {
    Form {
      Section {
        TextField("worker@example.com", text: $email)
          .keyboardType(.emailAddress)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
      } header: {
        Text("Their email *")
      } footer: {
        Text("They'll need to sign in with this exact email.")
      }

      Section("Optional details") {
        TextField("Name (optional)", text: $name)
        TextField("Role (e.g. Crew, Tech)", text: $role)
        Toggle("Grant manager rights", isOn: $isManager)
      }

      if let error {
        Section {
          Text(error).font(.caption).foregroundStyle(.red)
        }
      }
    }
  }

  private func successView(_ inv: WorkerInvitation) -> some View {
    ScrollView {
      VStack(spacing: 16) {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 48))
          .foregroundStyle(Theme.mossDeep)
          .padding(.top, 16)

        Text("Send this link to \(inv.email)")
          .font(.body)
          .foregroundStyle(Theme.ink700)
          .multilineTextAlignment(.center)

        let link = "https://drevito.com/join/\(inv.token)"

        VStack(alignment: .leading, spacing: 6) {
          Text("INVITATION LINK")
            .font(.caption2.weight(.bold))
            .tracking(1)
            .foregroundStyle(Theme.ink400)
          Text(link)
            .font(.system(.caption, design: .monospaced))
            .foregroundStyle(Theme.ink700)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Theme.ink50)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }

        ShareLink(item: URL(string: link)!) {
          HStack {
            Image(systemName: "square.and.arrow.up")
            Text("Share link").fontWeight(.semibold)
          }
          .frame(maxWidth: .infinity)
          .padding()
          .background(Theme.amber)
          .foregroundStyle(Theme.ink800)
          .clipShape(RoundedRectangle(cornerRadius: 14))
        }

        Button(action: {
          UIPasteboard.general.string = link
        }) {
          HStack {
            Image(systemName: "doc.on.doc")
            Text("Copy link").fontWeight(.medium)
          }
          .frame(maxWidth: .infinity)
          .padding()
          .background(.white)
          .foregroundStyle(Theme.ink700)
          .clipShape(RoundedRectangle(cornerRadius: 14))
          .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink200))
        }

        Text("Link expires in 14 days. You can cancel it anytime from the Crew screen.")
          .font(.caption)
          .foregroundStyle(Theme.ink400)
          .multilineTextAlignment(.center)
          .padding(.top, 8)
      }
      .padding(20)
    }
  }

  private func create() async {
    busy = true; error = nil
    defer { busy = false }
    do {
      let inv = try await SupabaseService().createInvitation(
        businessId: businessId,
        email: email.trimmingCharacters(in: .whitespaces),
        name: name.isEmpty ? nil : name,
        role: role.isEmpty ? "Crew" : role,
        isManager: isManager
      )
      await MainActor.run {
        self.createdInvitation = inv
        onCreated()
      }
    } catch {
      self.error = error.localizedDescription
    }
  }
}
