import SwiftUI

/// Список всіх клієнтів бізнесу з пошуком.
struct ClientsListView: View {
  @Environment(AppState.self) private var state

  @State private var clients: [Client] = []
  @State private var loading = true
  @State private var search = ""
  @State private var error: String?

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      VStack(spacing: 0) {
        // Search bar
        HStack {
          Image(systemName: "magnifyingglass")
            .foregroundStyle(Theme.ink400)
          TextField("Search clients", text: $search)
            .textInputAutocapitalization(.words)
          if !search.isEmpty {
            Button(action: { search = "" }) {
              Image(systemName: "xmark.circle.fill")
                .foregroundStyle(Theme.ink300)
            }
          }
        }
        .padding(12)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 16)
        .padding(.vertical, 10)

        if loading {
          Spacer()
          ProgressView().tint(Theme.amber)
          Spacer()
        } else if filtered.isEmpty {
          Spacer()
          Text(search.isEmpty ? "No clients yet" : "No matches")
            .font(.headline)
            .foregroundStyle(Theme.ink400)
          Spacer()
        } else {
          ScrollView {
            LazyVStack(spacing: 8) {
              ForEach(filtered) { client in
                NavigationLink(destination: ClientDetailView(clientId: client.id)) {
                  ClientRow(client: client)
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
    .navigationTitle("Clients")
    .navigationBarTitleDisplayMode(.large)
    .task { await load() }
    .refreshable { await load() }
  }

  private var filtered: [Client] {
    guard !search.isEmpty else { return clients }
    let q = search.lowercased()
    return clients.filter {
      $0.name.lowercased().contains(q)
        || ($0.phone?.lowercased().contains(q) ?? false)
        || ($0.email?.lowercased().contains(q) ?? false)
    }
  }

  private func load() async {
    guard let bid = state.role?.business?.id else { return }
    loading = true
    defer { loading = false }
    do {
      let result = try await SupabaseService().allClients(businessId: bid)
      await MainActor.run { self.clients = result }
    } catch {
      self.error = error.localizedDescription
    }
  }
}

private struct ClientRow: View {
  let client: Client

  var body: some View {
    HStack(spacing: 12) {
      Text(initials(client.name))
        .font(.subheadline.weight(.semibold))
        .frame(width: 40, height: 40)
        .background(Theme.amberSoft)
        .foregroundStyle(Theme.amberDeep)
        .clipShape(Circle())

      VStack(alignment: .leading, spacing: 2) {
        Text(client.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink800)
        if let phone = client.phone, !phone.isEmpty {
          Text(phone).font(.caption).foregroundStyle(Theme.ink500)
        }
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

  private func initials(_ name: String) -> String {
    let parts = name.split(separator: " ").prefix(2)
    return parts.map { String($0.first!) }.joined().uppercased()
  }
}
