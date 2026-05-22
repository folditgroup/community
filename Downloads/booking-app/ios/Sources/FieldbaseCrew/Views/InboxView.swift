import SwiftUI

/// Список requests від клієнтів через AI chat / форму.
/// Manager може конвертувати в booking, відмітити як contacted, dismissed.
struct InboxView: View {
  @Environment(AppState.self) private var state

  @State private var leads: [Lead] = []
  @State private var services: [Service] = []
  @State private var loading = true
  @State private var filter: LeadStatus? = .new
  @State private var error: String?
  @State private var refreshTrigger = 0

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      VStack(spacing: 0) {
        filterBar
          .padding(.horizontal, 16)
          .padding(.vertical, 10)
          .background(Theme.ink50)

        if loading {
          Spacer()
          ProgressView().tint(Theme.amber)
          Spacer()
        } else if filteredLeads.isEmpty {
          emptyState
        } else {
          ScrollView {
            LazyVStack(spacing: 10) {
              ForEach(filteredLeads) { lead in
                NavigationLink(destination: LeadDetailView(lead: lead, services: services, onChanged: { refreshTrigger += 1 })) {
                  LeadRowView(lead: lead, services: services)
                }
                .buttonStyle(.plain)
              }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
          }
        }
      }
    }
    .navigationTitle("Inbox")
    .navigationBarTitleDisplayMode(.large)
    .task(id: refreshTrigger) { await load() }
    .refreshable { await load() }
    .alert("Error", isPresented: .init(get: { error != nil }, set: { if !$0 { error = nil } })) {
      Button("OK") { error = nil }
    } message: {
      Text(error ?? "")
    }
  }

  private var filterBar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        chip("New", count: leads.filter { $0.status == .new }.count, isActive: filter == .new) {
          filter = .new
        }
        chip("Contacted", count: leads.filter { $0.status == .contacted }.count, isActive: filter == .contacted) {
          filter = .contacted
        }
        chip("Converted", count: leads.filter { $0.status == .converted }.count, isActive: filter == .converted) {
          filter = .converted
        }
        chip("Dismissed", count: leads.filter { $0.status == .dismissed }.count, isActive: filter == .dismissed) {
          filter = .dismissed
        }
        chip("All", count: leads.count, isActive: filter == nil) {
          filter = nil
        }
      }
    }
  }

  private func chip(_ label: String, count: Int, isActive: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      HStack(spacing: 4) {
        Text(label).fontWeight(.medium)
        if count > 0 { Text("\(count)").font(.caption.bold()) }
      }
      .font(.subheadline)
      .padding(.horizontal, 12).padding(.vertical, 6)
      .background(isActive ? Theme.ink800 : .white)
      .foregroundStyle(isActive ? Theme.ink50 : Theme.ink600)
      .clipShape(Capsule())
      .overlay(Capsule().strokeBorder(isActive ? Color.clear : Theme.ink200))
    }
  }

  private var filteredLeads: [Lead] {
    if let f = filter { return leads.filter { $0.status == f } }
    return leads
  }

  private var emptyState: some View {
    VStack(spacing: 12) {
      Spacer()
      Image(systemName: "tray")
        .font(.system(size: 48))
        .foregroundStyle(Theme.ink300)
      Text(filter == .new ? "No new leads" : "Nothing here")
        .font(.headline)
        .foregroundStyle(Theme.ink600)
      Text(filter == .new
        ? "When customers chat with your AI assistant, their requests appear here."
        : "Try a different filter.")
        .font(.subheadline)
        .foregroundStyle(Theme.ink400)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 40)
      Spacer()
    }
  }

  private func load() async {
    guard let bid = state.role?.business?.id else { return }
    loading = true
    defer { loading = false }
    do {
      async let l = SupabaseService().leads(businessId: bid)
      async let s = SupabaseService().allServices(businessId: bid)
      let (leadsResult, servicesResult) = try await (l, s)
      await MainActor.run {
        self.leads = leadsResult
        self.services = servicesResult
      }
    } catch {
      self.error = error.localizedDescription
    }
  }
}

private struct LeadRowView: View {
  let lead: Lead
  let services: [Service]

  private var serviceName: String? {
    guard let sid = lead.serviceId else { return nil }
    return services.first(where: { $0.id == sid })?.name
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        statusBadge
        Spacer()
        Text(timeAgo(lead.createdAt))
          .font(.caption)
          .foregroundStyle(Theme.ink400)
      }
      Text(lead.customerName)
        .font(.displaySmall)
        .foregroundStyle(Theme.ink800)
      if let phone = lead.customerPhone {
        HStack(spacing: 4) {
          Image(systemName: "phone")
          Text(phone)
        }
        .font(.caption)
        .foregroundStyle(Theme.ink500)
      }
      if let svc = serviceName {
        Text("Service: \(svc)")
          .font(.caption)
          .foregroundStyle(Theme.ink600)
      }
      if let msg = lead.message {
        Text("\"\(msg)\"")
          .font(.caption)
          .foregroundStyle(Theme.ink600)
          .lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 14))
    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
  }

  private var statusBadge: some View {
    let (label, color, bg): (String, Color, Color) = {
      switch lead.status {
      case .new:       return ("NEW",       Theme.amberDeep, Theme.amberSoft)
      case .contacted: return ("CONTACTED", .blue,           Color.blue.opacity(0.12))
      case .converted: return ("CONVERTED", Theme.mossDeep,  Theme.mossSoft)
      case .dismissed: return ("DISMISSED", Theme.ink500,    Theme.ink100)
      }
    }()
    return Text(label)
      .font(.caption2.weight(.bold))
      .padding(.horizontal, 6).padding(.vertical, 3)
      .background(bg)
      .foregroundStyle(color)
      .clipShape(Capsule())
  }

  private func timeAgo(_ date: Date) -> String {
    let s = Int(Date().timeIntervalSince(date))
    if s < 60 { return "just now" }
    if s < 3600 { return "\(s/60)m ago" }
    if s < 86400 { return "\(s/3600)h ago" }
    return "\(s/86400)d ago"
  }
}
