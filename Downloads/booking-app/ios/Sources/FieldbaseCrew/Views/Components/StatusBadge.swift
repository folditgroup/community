import SwiftUI

struct StatusBadge: View {
  let status: BookingStatus

  var body: some View {
    HStack(spacing: 6) {
      Circle().fill(color.opacity(0.7)).frame(width: 6, height: 6)
      Text(status.label).font(.caption2).fontWeight(.medium)
    }
    .padding(.horizontal, 8).padding(.vertical, 4)
    .background(bg)
    .foregroundStyle(color)
    .clipShape(Capsule())
  }

  private var color: Color {
    switch status {
    case .scheduled:  return Theme.ink600
    case .inProgress: return Theme.amberDeep
    case .completed:  return Theme.moss
    case .cancelled:  return .red
    }
  }
  private var bg: Color {
    switch status {
    case .scheduled:  return Theme.ink100
    case .inProgress: return Theme.amberSoft
    case .completed:  return Theme.mossSoft
    case .cancelled:  return Color.red.opacity(0.1)
    }
  }
}
