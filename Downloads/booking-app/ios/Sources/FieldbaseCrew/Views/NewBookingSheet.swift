import SwiftUI

/// Sheet для створення нового booking.
///
/// Підтримує prefill — для convert lead → booking:
///   - prefillClient: (name, phone, address) для нового клієнта
///   - prefillServiceId: вибрати сервіс автоматично
///   - prefillStart: початковий час
///
/// onCreated callback викликається з UUID нового booking — для зв'язку з lead.
struct NewBookingSheet: View {
  // Prefill params (optional)
  let prefillClient: (name: String, phone: String?, address: String?)?
  let prefillServiceId: UUID?
  let prefillStart: Date?
  let onCreated: ((UUID) -> Void)?

  init(
    prefillClient: (name: String, phone: String?, address: String?)? = nil,
    prefillServiceId: UUID? = nil,
    prefillStart: Date? = nil,
    onCreated: ((UUID) -> Void)? = nil
  ) {
    self.prefillClient = prefillClient
    self.prefillServiceId = prefillServiceId
    self.prefillStart = prefillStart
    self.onCreated = onCreated
  }

  @Environment(AppState.self) private var state
  @Environment(\.dismiss) private var dismiss

  @State private var existingClientId: UUID?
  @State private var newClientName = ""
  @State private var newClientPhone = ""
  @State private var newClientAddress = ""
  @State private var allClients: [Client] = []
  @State private var serviceId: UUID?
  @State private var startAt: Date = Date()
  @State private var selectedWorkerIds: Set<UUID> = []
  @State private var notes = ""
  @State private var priceText = ""
  @State private var priceTouched = false
  @State private var saving = false
  @State private var errorMsg: String?
  @State private var initialized = false

  private var selectedService: Service? {
    state.services.first(where: { $0.id == serviceId })
  }

  /// Ефективна ціна: якщо юзер не чіпав — з service.basePrice
  private var effectivePrice: Double {
    if priceTouched { return Double(priceText) ?? 0 }
    return selectedService?.basePrice ?? 0
  }

  private var canSave: Bool {
    let hasClient = existingClientId != nil || !newClientName.trimmingCharacters(in: .whitespaces).isEmpty
    return hasClient && serviceId != nil && !saving
  }

  var body: some View {
    NavigationStack {
      Form {
        clientSection
        serviceSection
        timeSection
        workersSection
        notesSection
        if let err = errorMsg {
          Section {
            Text(err).foregroundStyle(.red).font(.callout)
          }
        }
      }
      .navigationTitle("New booking")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button(saving ? "Creating…" : "Create") {
            Task { await save() }
          }
          .disabled(!canSave)
          .fontWeight(.semibold)
        }
      }
      .task {
        await loadClients()
        if !initialized { applyPrefill(); initialized = true }
      }
    }
  }

  private var clientSection: some View {
    Section {
      Picker("Client", selection: $existingClientId) {
        Text("— New client —").tag(UUID?.none)
        ForEach(allClients) { c in
          Text(c.name).tag(UUID?.some(c.id))
        }
      }
      if existingClientId == nil {
        TextField("Name *", text: $newClientName)
          .textInputAutocapitalization(.words)
        TextField("Phone", text: $newClientPhone).keyboardType(.phonePad)
        TextField("Address", text: $newClientAddress)
      }
    } header: {
      Text("Client")
    }
  }

  private var serviceSection: some View {
    Section {
      Picker("Service", selection: $serviceId) {
        Text("— Choose —").tag(UUID?.none)
        ForEach(state.services) { s in
          Text("\(s.name) — \(s.priceLabel)").tag(UUID?.some(s.id))
        }
      }
      if let svc = selectedService {
        HStack {
          Text("Duration").foregroundStyle(Theme.ink400)
          Spacer()
          Text("\(svc.durationMin) min").foregroundStyle(Theme.ink700)
        }
        // Editable price
        HStack {
          Text("Price").foregroundStyle(Theme.ink400)
          Spacer()
          Text("$").foregroundStyle(Theme.ink400)
          TextField(
            "0.00",
            text: Binding(
              get: { priceTouched ? priceText : String(format: "%.2f", svc.basePrice) },
              set: { priceText = $0; priceTouched = true }
            )
          )
          .keyboardType(.decimalPad)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 100)
          .foregroundStyle(Theme.ink800)
        }
        if priceTouched {
          Button("Reset to \(svc.priceLabel)") {
            priceTouched = false
            priceText = ""
          }
          .font(.caption)
          .foregroundStyle(Theme.amberDeep)
        } else if svc.priceType == "quote" {
          Text("This service is quote-based. Enter a price for this job.")
            .font(.caption).foregroundStyle(Theme.ink400)
        }
      }
    } header: {
      Text("Service & price")
    }
  }

  private var timeSection: some View {
    Section {
      DatePicker("Start", selection: $startAt, displayedComponents: [.date, .hourAndMinute])
    } header: {
      Text("Time")
    }
  }

  private var workersSection: some View {
    Section {
      if state.workers.isEmpty {
        Text("No workers yet.")
          .foregroundStyle(Theme.ink400)
          .font(.callout)
      } else {
        ForEach(state.workers) { w in
          Button {
            if selectedWorkerIds.contains(w.id) {
              selectedWorkerIds.remove(w.id)
            } else {
              selectedWorkerIds.insert(w.id)
            }
          } label: {
            HStack {
              Image(systemName: selectedWorkerIds.contains(w.id) ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(selectedWorkerIds.contains(w.id) ? Theme.amber : Theme.ink400)
              Text(w.name).foregroundStyle(Theme.ink800)
              if w.isManager {
                Text("MANAGER")
                  .font(.caption2).fontWeight(.bold)
                  .padding(.horizontal, 5).padding(.vertical, 2)
                  .background(Theme.amber.opacity(0.2))
                  .foregroundStyle(Theme.ink700)
                  .clipShape(Capsule())
              }
              Spacer()
            }
          }
          .buttonStyle(.plain)
        }
      }
    } header: {
      Text("Assigned workers")
    }
  }

  private var notesSection: some View {
    Section {
      TextField("Notes (optional)", text: $notes, axis: .vertical)
        .lineLimit(3...6)
    } header: {
      Text("Notes")
    }
  }

  private func applyPrefill() {
    if let pc = prefillClient {
      newClientName = pc.name
      newClientPhone = pc.phone ?? ""
      newClientAddress = pc.address ?? ""
    }
    if let sid = prefillServiceId {
      serviceId = sid
    }
    if let start = prefillStart {
      startAt = start
    } else {
      // Default — tomorrow 9 AM
      let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
      startAt = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: tomorrow) ?? tomorrow
    }
  }

  private func loadClients() async {
    guard let business = state.role?.business else { return }
    do {
      let clients = try await SupabaseService().allClients(businessId: business.id)
      await MainActor.run { self.allClients = clients }
    } catch {
      // Тихо
    }
  }

  private func save() async {
    guard let svc = selectedService else { return }
    guard let business = state.role?.business else { return }
    saving = true; errorMsg = nil
    defer { saving = false }

    let newClient: (name: String, phone: String?, address: String?)? = existingClientId == nil
      ? (
          name: newClientName.trimmingCharacters(in: .whitespaces),
          phone: newClientPhone.isEmpty ? nil : newClientPhone,
          address: newClientAddress.isEmpty ? nil : newClientAddress
        )
      : nil

    do {
      let bookingId = try await SupabaseService().createBooking(
        businessId: business.id,
        existingClientId: existingClientId,
        newClient: newClient,
        serviceId: svc.id,
        workerIds: Array(selectedWorkerIds),
        startAt: startAt,
        durationMin: svc.durationMin,
        price: effectivePrice,
        notes: notes.isEmpty ? nil : notes
      )
      await state.refresh()
      onCreated?(bookingId)
      dismiss()
    } catch {
      errorMsg = error.localizedDescription
    }
  }
}
