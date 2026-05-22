import SwiftUI
import UIKit

/// Деталі клієнта + історія його bookings.
struct ClientDetailView: View {
  let clientId: UUID

  @State private var client: Client?
  @State private var bookings: [BookingWithService] = []
  @State private var loading = true
  @State private var editing = false

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      if loading {
        ProgressView().tint(Theme.amber)
      } else if let client {
        ScrollView {
          VStack(alignment: .leading, spacing: 18) {
            // Header
            HStack(spacing: 14) {
              Text(initials(client.name))
                .font(.title.bold())
                .frame(width: 60, height: 60)
                .background(Theme.amberSoft)
                .foregroundStyle(Theme.amberDeep)
                .clipShape(Circle())
              VStack(alignment: .leading, spacing: 2) {
                Text(client.name).font(.displayMedium).foregroundStyle(Theme.ink800)
                if let notes = client.notes, !notes.isEmpty {
                  Text(notes).font(.caption).foregroundStyle(Theme.ink500).lineLimit(1)
                }
              }
              Spacer()
            }

            // Contact actions
            VStack(spacing: 8) {
              if let phone = client.phone, !phone.isEmpty {
                quickAction(icon: "phone.fill", title: "Call", subtitle: phone) {
                  call(phone)
                }
                quickAction(icon: "message.fill", title: "Text", subtitle: phone) {
                  text(phone)
                }
              }
              if let email = client.email, !email.isEmpty {
                quickAction(icon: "envelope.fill", title: "Email", subtitle: email) {
                  emailAction(email)
                }
              }
              if let address = client.address, !address.isEmpty {
                quickAction(icon: "location.fill", title: "Navigate", subtitle: address) {
                  navigate(address)
                }
              }
            }

            // Bookings history
            if !bookings.isEmpty {
              VStack(alignment: .leading, spacing: 8) {
                Text("HISTORY")
                  .font(.caption2.weight(.bold))
                  .tracking(1)
                  .foregroundStyle(Theme.ink400)
                ForEach(bookings) { b in
                  bookingHistoryRow(b)
                }
              }
              .padding(.top, 8)
            }
          }
          .padding(20)
        }
      } else {
        Text("Client not found").foregroundStyle(Theme.ink400)
      }
    }
    .navigationTitle("Client")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      if client != nil {
        Button("Edit") { editing = true }
      }
    }
    .task { await load() }
    .sheet(isPresented: $editing) {
      if let c = client {
        EditClientSheet(client: c, onSaved: { Task { await load() } })
      }
    }
  }

  private func quickAction(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 12) {
        Image(systemName: icon)
          .frame(width: 32, height: 32)
          .background(Theme.amberSoft)
          .foregroundStyle(Theme.amberDeep)
          .clipShape(Circle())
        VStack(alignment: .leading, spacing: 1) {
          Text(title).font(.caption).foregroundStyle(Theme.ink400)
          Text(subtitle).font(.body).foregroundStyle(Theme.ink800).lineLimit(1)
        }
        Spacer()
        Image(systemName: "chevron.right")
          .font(.caption.weight(.bold))
          .foregroundStyle(Theme.ink300)
      }
      .padding(12)
      .background(.white)
      .clipShape(RoundedRectangle(cornerRadius: 12))
      .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.ink100))
    }
    .buttonStyle(.plain)
  }

  private func bookingHistoryRow(_ b: BookingWithService) -> some View {
    NavigationLink(destination: JobDetailView(booking: b)) {
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(b.serviceName ?? "Service").font(.body.weight(.semibold)).foregroundStyle(Theme.ink800)
          Spacer()
          Text("$\(Int(b.booking.price))").font(.caption.weight(.semibold)).foregroundStyle(Theme.ink600)
        }
        HStack {
          Text(formatDate(b.booking.start)).font(.caption).foregroundStyle(Theme.ink500)
          Spacer()
          Text(b.booking.status.label)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(statusColor(b.booking.status).opacity(0.15))
            .foregroundStyle(statusColor(b.booking.status))
            .clipShape(Capsule())
        }
      }
      .padding(10)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(.white)
      .clipShape(RoundedRectangle(cornerRadius: 10))
      .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.ink100))
    }
    .buttonStyle(.plain)
  }

  private func statusColor(_ s: BookingStatus) -> Color {
    switch s {
    case .scheduled:  return .blue
    case .inProgress: return .orange
    case .completed:  return Theme.mossDeep
    case .cancelled:  return Theme.ink400
    }
  }

  private func formatDate(_ d: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "MMM d, yyyy · h:mm a"
    return f.string(from: d)
  }

  private func initials(_ name: String) -> String {
    let parts = name.split(separator: " ").prefix(2)
    return parts.map { String($0.first!) }.joined().uppercased()
  }

  private func call(_ phone: String) {
    if let url = URL(string: "tel://\(phone.filter { !$0.isWhitespace })") {
      UIApplication.shared.open(url)
    }
  }
  private func text(_ phone: String) {
    if let url = URL(string: "sms:\(phone.filter { !$0.isWhitespace })") {
      UIApplication.shared.open(url)
    }
  }
  private func emailAction(_ email: String) {
    if let url = URL(string: "mailto:\(email)") {
      UIApplication.shared.open(url)
    }
  }
  private func navigate(_ address: String) {
    let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    if let url = URL(string: "http://maps.apple.com/?address=\(encoded)") {
      UIApplication.shared.open(url)
    }
  }

  private func load() async {
    loading = true
    defer { loading = false }
    do {
      async let c = SupabaseService().clientById(clientId)
      async let b = SupabaseService().bookingsForClient(clientId)
      let (clientResult, bookingsResult) = try await (c, b)
      await MainActor.run {
        self.client = clientResult
        self.bookings = bookingsResult
      }
    } catch {
      print("ClientDetail load error:", error)
    }
  }
}

/// Sheet to edit client details.
struct EditClientSheet: View {
  let client: Client
  let onSaved: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var name: String
  @State private var phone: String
  @State private var email: String
  @State private var address: String
  @State private var notes: String
  @State private var saving = false
  @State private var error: String?

  init(client: Client, onSaved: @escaping () -> Void) {
    self.client = client
    self.onSaved = onSaved
    _name = State(initialValue: client.name)
    _phone = State(initialValue: client.phone ?? "")
    _email = State(initialValue: client.email ?? "")
    _address = State(initialValue: client.address ?? "")
    _notes = State(initialValue: client.notes ?? "")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("Contact") {
          TextField("Name", text: $name)
          TextField("Phone", text: $phone).keyboardType(.phonePad)
          TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
          TextField("Address", text: $address)
        }
        Section("Notes") {
          TextField("Internal notes", text: $notes, axis: .vertical)
            .lineLimit(3, reservesSpace: true)
        }
      }
      .navigationTitle("Edit client")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button(saving ? "Saving…" : "Save") { Task { await save() } }
            .disabled(saving || name.isEmpty)
        }
      }
      .alert("Error", isPresented: .init(get: { error != nil }, set: { if !$0 { error = nil } })) {
        Button("OK") { error = nil }
      } message: {
        Text(error ?? "")
      }
    }
  }

  private func save() async {
    saving = true; error = nil
    defer { saving = false }
    do {
      try await SupabaseService().updateClient(
        id: client.id,
        name: name,
        phone: phone.isEmpty ? nil : phone,
        email: email.isEmpty ? nil : email,
        address: address.isEmpty ? nil : address,
        notes: notes.isEmpty ? nil : notes
      )
      onSaved()
      dismiss()
    } catch {
      self.error = error.localizedDescription
    }
  }
}
