import SwiftUI

struct JobRow: View {
  let item: BookingWithService
  let client: Client?

  private var booking: Booking { item.booking }

  var body: some View {
    HStack(spacing: 14) {
      VStack(spacing: 2) {
        Image(systemName: "clock").font(.caption).foregroundStyle(Theme.ink400)
        Text(formatTime(booking.start)).font(.callout).fontWeight(.semibold).foregroundStyle(Theme.ink700)
        Text(formatTime(booking.end)).font(.caption2).foregroundStyle(Theme.ink400)
      }
      .frame(width: 64)
      .padding(.vertical, 10)
      .background(Theme.ink50)
      .clipShape(RoundedRectangle(cornerRadius: 12))

      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(client?.name ?? "Walk-in").font(.callout).fontWeight(.semibold).foregroundStyle(Theme.ink800)
          Spacer()
          StatusBadge(status: booking.status)
        }
        Text(item.serviceName ?? "Service").font(.caption).foregroundStyle(Theme.ink400)
        HStack(spacing: 4) {
          Image(systemName: "mappin.and.ellipse").font(.caption2)
          Text(booking.address).font(.caption2).lineLimit(1)
        }
        .foregroundStyle(Theme.ink400)
      }
      Image(systemName: "chevron.right").foregroundStyle(Theme.ink400.opacity(0.6))
    }
    .padding(14)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 16))
    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.ink100))
  }

  private func formatTime(_ d: Date) -> String {
    let f = DateFormatter(); f.dateFormat = "h:mm a"
    return f.string(from: d)
  }
}
