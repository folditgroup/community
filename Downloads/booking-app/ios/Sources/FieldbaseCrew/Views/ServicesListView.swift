import SwiftUI

/// Список сервісів — view-only.
/// Edit/Add робиться на вебі через Services сторінку.
struct ServicesListView: View {
  @Environment(AppState.self) private var state

  @State private var services: [Service] = []
  @State private var loading = true

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      if loading {
        ProgressView().tint(Theme.amber)
      } else if services.isEmpty {
        VStack(spacing: 12) {
          Image(systemName: "wrench.and.screwdriver")
            .font(.system(size: 48))
            .foregroundStyle(Theme.ink300)
          Text("No services yet")
            .font(.headline)
            .foregroundStyle(Theme.ink600)
          Text("Add services on the web at drevito.com to enable bookings.")
            .font(.subheadline)
            .foregroundStyle(Theme.ink400)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 40)
        }
      } else {
        ScrollView {
          LazyVStack(spacing: 10) {
            ForEach(services) { svc in
              VStack(alignment: .leading, spacing: 6) {
                HStack {
                  Text(svc.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink800)
                  Spacer()
                  Text(svc.priceLabel).font(.body.weight(.bold)).foregroundStyle(Theme.amberDeep)
                }
                HStack(spacing: 12) {
                  HStack(spacing: 3) {
                    Image(systemName: "clock").font(.caption2)
                    Text("\(svc.durationMin) min")
                  }
                  HStack(spacing: 3) {
                    Image(systemName: "arrow.left.and.right").font(.caption2)
                    Text("\(svc.bufferMin) min buffer")
                  }
                }
                .font(.caption)
                .foregroundStyle(Theme.ink500)
              }
              .padding(14)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(.white)
              .clipShape(RoundedRectangle(cornerRadius: 14))
              .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink100))
            }

            // Footer hint
            VStack(spacing: 6) {
              Image(systemName: "info.circle")
                .font(.title3)
                .foregroundStyle(Theme.ink400)
              Text("Edit services on drevito.com")
                .font(.caption)
                .foregroundStyle(Theme.ink500)
            }
            .padding(.top, 12)
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 12)
        }
      }
    }
    .navigationTitle("Services")
    .navigationBarTitleDisplayMode(.large)
    .task { await load() }
    .refreshable { await load() }
  }

  private func load() async {
    guard let bid = state.role?.business?.id else { return }
    loading = true
    defer { loading = false }
    do {
      let result = try await SupabaseService().allServices(businessId: bid)
      await MainActor.run { self.services = result }
    } catch {
      print("Services load error:", error)
    }
  }
}
