import SwiftUI
import MapKit
import UIKit

struct JobDetailView: View {
  let item: BookingWithService

  // Convenience init для викликів з ClientDetailView/Inbox
  init(booking: BookingWithService) {
    self.item = booking
  }
  init(item: BookingWithService) {
    self.item = item
  }

  @Environment(AppState.self) private var state
  @Environment(\.dismiss) private var dismiss
  @State private var notes: String = ""
  @State private var priceText: String = ""
  @State private var tipText: String = ""
  @State private var addressText: String = ""
  @State private var savingDetails = false
  @State private var confirmDelete = false

  private var booking: Booking { item.booking }
  private var client: Client? { booking.clientId.flatMap { state.clientsById[$0] } }
  private var isManager: Bool { state.role?.isManager == true }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        VStack(alignment: .leading, spacing: 6) {
          Text(timeRange).font(.caption).tracking(1).foregroundStyle(Theme.ink400)
          Text(client?.name ?? "Booking").font(.displayLarge).foregroundStyle(Theme.ink800)
          Text(item.serviceName ?? "Service").foregroundStyle(Theme.ink400)
        }

        HStack(spacing: 10) {
          actionButton(title: "Maps", system: "map.fill") { openMaps() }
          if let phone = client?.phone, !phone.isEmpty, let url = URL(string: "tel:\(phone.filter { $0.isNumber })") {
            actionButton(title: "Call", system: "phone.fill") { UIApplication.shared.open(url) }
          }
          if let phone = client?.phone, !phone.isEmpty, let url = URL(string: "sms:\(phone.filter { $0.isNumber })") {
            actionButton(title: "Text", system: "message.fill") { UIApplication.shared.open(url) }
          }
        }

        // Quick status shortcuts
        quickStatusButtons

        infoCard
        statusPicker
        notesCard

        if isManager {
          Button(role: .destructive) {
            confirmDelete = true
          } label: {
            HStack {
              Image(systemName: "trash")
              Text("Delete booking").fontWeight(.medium)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 12)
            .background(Color.red.opacity(0.1)).foregroundStyle(.red).clipShape(Capsule())
          }
        }
      }
      .padding(20)
    }
    .background(Theme.ink50.ignoresSafeArea())
    .navigationBarTitleDisplayMode(.inline)
    .onAppear {
      notes = booking.notes ?? ""
      priceText = String(format: "%.2f", booking.price)
      tipText = String(format: "%.2f", booking.tip)
      addressText = booking.address
    }
    .alert("Delete booking?", isPresented: $confirmDelete) {
      Button("Cancel", role: .cancel) {}
      Button("Delete", role: .destructive) {
        Task {
          await state.deleteBooking(item)
          dismiss()
        }
      }
    } message: {
      Text("This will permanently remove the booking. The client won't be notified.")
    }
  }

  private var quickStatusButtons: some View {
    HStack(spacing: 10) {
      if booking.status == .scheduled {
        bigStatusButton(title: "Start job", icon: "play.fill", color: .orange) {
          Task { await state.setStatus(item, status: .inProgress, notes: notes) }
        }
      }
      if booking.status == .inProgress {
        bigStatusButton(title: "Mark done", icon: "checkmark.circle.fill", color: Theme.mossDeep) {
          Task { await state.setStatus(item, status: .completed, notes: notes) }
        }
      }
      if booking.status == .completed {
        Label {
          Text("Completed").fontWeight(.semibold)
        } icon: {
          Image(systemName: "checkmark.seal.fill")
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(Theme.mossSoft)
        .foregroundStyle(Theme.mossDeep)
        .clipShape(RoundedRectangle(cornerRadius: 12))
      }
    }
  }

  private func bigStatusButton(title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack {
        Image(systemName: icon)
        Text(title).fontWeight(.semibold)
      }
      .frame(maxWidth: .infinity).padding(.vertical, 14)
      .background(color)
      .foregroundStyle(.white)
      .clipShape(RoundedRectangle(cornerRadius: 12))
    }
  }

  private var infoCard: some View {
    Group {
      if isManager {
        editableInfoCard
      } else {
        // Worker view — no money shown.
        VStack(alignment: .leading, spacing: 12) {
          row(label: "Address", value: booking.address.isEmpty ? "—" : booking.address)
          if let phone = client?.phone {
            row(label: "Phone", value: phone)
          }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
      }
    }
  }

  /// Editable картка для менеджера — ціна + адреса з кнопкою Save.
  private var editableInfoCard: some View {
    VStack(alignment: .leading, spacing: 14) {
      // Price
      VStack(alignment: .leading, spacing: 6) {
        Text("PRICE").font(.caption2).tracking(1).foregroundStyle(Theme.ink400)
        HStack(spacing: 6) {
          Text("$").foregroundStyle(Theme.ink400)
          TextField("0.00", text: $priceText)
            .keyboardType(.decimalPad)
            .font(.title3.weight(.semibold))
            .foregroundStyle(Theme.ink800)
        }
        .padding(12)
        .background(Theme.ink50)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        Text("Adjust for custom quotes, discounts, or extra work.")
          .font(.caption2).foregroundStyle(Theme.ink400)
      }

      // Tip
      VStack(alignment: .leading, spacing: 6) {
        Text("TIP").font(.caption2).tracking(1).foregroundStyle(Theme.ink400)
        HStack(spacing: 6) {
          Text("$").foregroundStyle(Theme.ink400)
          TextField("0.00", text: $tipText)
            .keyboardType(.decimalPad)
            .font(.title3.weight(.semibold))
            .foregroundStyle(Theme.ink800)
        }
        .padding(12)
        .background(Theme.ink50)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        Text("Counts toward earnings.")
          .font(.caption2).foregroundStyle(Theme.ink400)
      }

      // Address
      VStack(alignment: .leading, spacing: 6) {
        Text("ADDRESS").font(.caption2).tracking(1).foregroundStyle(Theme.ink400)
        TextField("Job site address", text: $addressText)
          .padding(12)
          .background(Theme.ink50)
          .clipShape(RoundedRectangle(cornerRadius: 10))
      }

      if let phone = client?.phone {
        row(label: "Phone", value: phone)
      }

      // Save button — з'являється коли є зміни
      if hasDetailChanges {
        Button {
          Task { await saveDetails() }
        } label: {
          HStack {
            if savingDetails { ProgressView().tint(Theme.ink800) }
            Text(savingDetails ? "Saving…" : "Save changes").fontWeight(.semibold)
          }
          .frame(maxWidth: .infinity).padding(.vertical, 12)
          .background(Theme.amber).foregroundStyle(Theme.ink800)
          .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(savingDetails)
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
  }

  private var hasDetailChanges: Bool {
    let priceChanged = (Double(priceText) ?? booking.price) != booking.price
    let tipChanged = (Double(tipText) ?? booking.tip) != booking.tip
    let addressChanged = addressText != booking.address
    return priceChanged || tipChanged || addressChanged
  }

  private func saveDetails() async {
    savingDetails = true
    defer { savingDetails = false }
    let newPrice = Double(priceText) ?? booking.price
    let newTip = Double(tipText) ?? booking.tip
    _ = await state.updateBookingDetails(
      item,
      price: newPrice,
      tip: newTip,
      address: addressText.isEmpty ? nil : addressText,
      notes: notes,
      status: booking.status,
      workerIds: booking.workerIds
    )
  }

  private var statusPicker: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("STATUS").font(.caption).tracking(1).foregroundStyle(Theme.ink400)
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(BookingStatus.allCases, id: \.self) { s in
            Button {
              Task { await state.setStatus(item, status: s, notes: notes) }
            } label: {
              Text(s.label)
                .font(.callout).fontWeight(.medium)
                .padding(.horizontal, 12).padding(.vertical, 8)
                .background(booking.status == s ? Theme.ink800 : Color.white)
                .foregroundStyle(booking.status == s ? Theme.ink50 : Theme.ink600)
                .clipShape(Capsule())
                .overlay(Capsule().strokeBorder(Theme.ink100))
            }
          }
        }
      }
    }
  }

  private var notesCard: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("NOTES").font(.caption).tracking(1).foregroundStyle(Theme.ink400)
      TextEditor(text: $notes)
        .frame(minHeight: 120)
        .padding(8)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
      Button {
        Task { await state.setStatus(item, status: booking.status, notes: notes) }
      } label: {
        Text("Save note").frame(maxWidth: .infinity).padding(.vertical, 12)
          .background(Theme.amber).foregroundStyle(Theme.ink800).clipShape(Capsule())
      }
    }
  }

  private func row(label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(label.uppercased()).font(.caption2).tracking(1).foregroundStyle(Theme.ink400)
      Text(value).foregroundStyle(Theme.ink700)
    }
  }

  private func actionButton(title: String, system: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack {
        Image(systemName: system)
        Text(title).fontWeight(.medium)
      }
      .frame(maxWidth: .infinity).padding(.vertical, 12)
      .background(Theme.ink800).foregroundStyle(Theme.ink50)
      .clipShape(Capsule())
    }
  }

  private func openMaps() {
    let q = booking.address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    if let url = URL(string: "http://maps.apple.com/?q=\(q)") {
      UIApplication.shared.open(url)
    }
  }

  private var timeRange: String {
    let f = DateFormatter(); f.dateFormat = "h:mm a"
    return "\(f.string(from: booking.start)) – \(f.string(from: booking.end))"
  }
}
