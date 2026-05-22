import SwiftUI
import UIKit

/// Деталі ліда — менеджер бачить контакти, повідомлення, дії.
struct LeadDetailView: View {
  let lead: Lead
  let services: [Service]
  let onChanged: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var working = false
  @State private var error: String?
  @State private var showConvertSheet = false

  private var service: Service? {
    guard let sid = lead.serviceId else { return nil }
    return services.first(where: { $0.id == sid })
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 18) {
        // Header
        VStack(alignment: .leading, spacing: 6) {
          Text("REQUEST FROM \(lead.source.uppercased())")
            .font(.caption2.weight(.bold))
            .tracking(1)
            .foregroundStyle(Theme.amberDeep)
          Text(lead.customerName)
            .font(.displayLarge)
            .foregroundStyle(Theme.ink800)
        }

        // Contact actions
        VStack(spacing: 10) {
          if let phone = lead.customerPhone, !phone.isEmpty {
            ContactRow(icon: "phone.fill", label: "Call", value: phone) {
              if let url = URL(string: "tel://\(phone.replacingOccurrences(of: " ", with: ""))") {
                UIApplication.shared.open(url)
              }
            }
            ContactRow(icon: "message.fill", label: "Text", value: phone) {
              if let url = URL(string: "sms:\(phone.replacingOccurrences(of: " ", with: ""))") {
                UIApplication.shared.open(url)
              }
            }
          }
          if let email = lead.customerEmail, !email.isEmpty {
            ContactRow(icon: "envelope.fill", label: "Email", value: email) {
              if let url = URL(string: "mailto:\(email)") {
                UIApplication.shared.open(url)
              }
            }
          }
          if let addr = lead.address, !addr.isEmpty {
            ContactRow(icon: "location.fill", label: "Address", value: addr) {
              let encoded = addr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
              if let url = URL(string: "http://maps.apple.com/?address=\(encoded)") {
                UIApplication.shared.open(url)
              }
            }
          }
        }

        // Service + message
        if service != nil || lead.message != nil || lead.preferredTime != nil {
          VStack(alignment: .leading, spacing: 12) {
            Text("Details")
              .font(.caption.weight(.bold))
              .tracking(1)
              .foregroundStyle(Theme.ink400)

            if let svc = service {
              detailRow(label: "Service", value: svc.name)
              detailRow(label: "Duration", value: "\(svc.durationMin) min · $\(Int(svc.basePrice))")
            }
            if let preferred = lead.preferredTime {
              detailRow(label: "Preferred time", value: formatDateTime(preferred))
            }
            if let message = lead.message, !message.isEmpty {
              VStack(alignment: .leading, spacing: 4) {
                Text("Message").font(.caption).foregroundStyle(Theme.ink400)
                Text("\"\(message)\"")
                  .font(.body)
                  .foregroundStyle(Theme.ink700)
                  .padding(12)
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .background(Theme.ink50)
                  .clipShape(RoundedRectangle(cornerRadius: 12))
              }
            }
          }
          .padding(14)
          .background(.white)
          .clipShape(RoundedRectangle(cornerRadius: 14))
          .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
        }

        // Actions
        VStack(spacing: 10) {
          if lead.status != .converted {
            Button(action: { showConvertSheet = true }) {
              actionLabel(icon: "calendar.badge.plus", text: "Convert to booking", primary: true)
            }
          }
          if lead.status == .new {
            Button(action: { Task { await update(.contacted) } }) {
              actionLabel(icon: "checkmark.circle", text: "Mark contacted", primary: false)
            }
          }
          if lead.status != .dismissed {
            Button(action: { Task { await update(.dismissed) } }) {
              actionLabel(icon: "xmark.circle", text: "Dismiss", primary: false, destructive: true)
            }
          }
          if lead.status == .dismissed {
            Button(action: { Task { await update(.new) } }) {
              actionLabel(icon: "arrow.uturn.left", text: "Reopen", primary: false)
            }
          }
        }
        .disabled(working)

        if let error {
          Text(error)
            .font(.caption)
            .foregroundStyle(.red)
        }
      }
      .padding(20)
    }
    .background(Theme.ink50)
    .navigationTitle("Request")
    .navigationBarTitleDisplayMode(.inline)
    .sheet(isPresented: $showConvertSheet) {
      NewBookingSheet(
        prefillClient: (name: lead.customerName, phone: lead.customerPhone, address: lead.address),
        prefillServiceId: lead.serviceId,
        prefillStart: lead.preferredTime,
        onCreated: { newBookingId in
          Task {
            try? await SupabaseService().linkLeadToBooking(leadId: lead.id, bookingId: newBookingId)
            onChanged()
            dismiss()
          }
        }
      )
    }
  }

  private func detailRow(label: String, value: String) -> some View {
    HStack {
      Text(label).font(.caption).foregroundStyle(Theme.ink400)
      Spacer()
      Text(value).font(.body).foregroundStyle(Theme.ink700)
    }
  }

  private func actionLabel(icon: String, text: String, primary: Bool, destructive: Bool = false) -> some View {
    HStack {
      Image(systemName: icon)
      Text(text).fontWeight(.semibold)
      Spacer()
    }
    .padding()
    .frame(maxWidth: .infinity)
    .background(primary ? Theme.amber : .white)
    .foregroundStyle(destructive ? .red : (primary ? Theme.ink800 : Theme.ink700))
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(primary ? .clear : Theme.ink200))
  }

  private func update(_ status: LeadStatus) async {
    working = true; error = nil
    defer { working = false }
    do {
      try await SupabaseService().updateLeadStatus(id: lead.id, status: status)
      onChanged()
      dismiss()
    } catch {
      self.error = error.localizedDescription
    }
  }

  private func formatDateTime(_ d: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "EEE, MMM d · h:mm a"
    return f.string(from: d)
  }
}

private struct ContactRow: View {
  let icon: String
  let label: String
  let value: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 12) {
        Image(systemName: icon)
          .font(.system(size: 16))
          .foregroundStyle(Theme.amberDeep)
          .frame(width: 32, height: 32)
          .background(Theme.amberSoft)
          .clipShape(Circle())
        VStack(alignment: .leading, spacing: 1) {
          Text(label).font(.caption).foregroundStyle(Theme.ink400)
          Text(value).font(.body).foregroundStyle(Theme.ink800)
        }
        Spacer()
        Image(systemName: "chevron.right")
          .font(.caption.weight(.bold))
          .foregroundStyle(Theme.ink300)
      }
      .padding(14)
      .background(.white)
      .clipShape(RoundedRectangle(cornerRadius: 14))
      .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
    }
    .buttonStyle(.plain)
  }
}
