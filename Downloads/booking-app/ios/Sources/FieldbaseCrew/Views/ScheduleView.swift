import SwiftUI

/// Перегляд робочого графіку бізнесу.
/// Read-only — редагування на вебі.
struct ScheduleView: View {
  @Environment(AppState.self) private var state

  private let dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  private let dayLabels: [String: String] = [
    "mon": "Monday",   "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday",
    "fri": "Friday",   "sat": "Saturday", "sun": "Sunday"
  ]

  var body: some View {
    ZStack {
      Theme.ink50.ignoresSafeArea()
      ScrollView {
        VStack(spacing: 10) {
          if let schedule = state.role?.business?.schedule {
            ForEach(dayKeys, id: \.self) { key in
              let day = schedule[key]
              dayRow(label: dayLabels[key] ?? key, day: day)
            }
          } else {
            VStack(spacing: 12) {
              Image(systemName: "clock")
                .font(.system(size: 48))
                .foregroundStyle(Theme.ink300)
              Text("Default schedule")
                .font(.headline)
                .foregroundStyle(Theme.ink600)
              Text("Set your working hours on drevito.com → Settings.")
                .font(.subheadline)
                .foregroundStyle(Theme.ink400)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            }
            .padding(.top, 40)
          }

          if let slotMin = state.role?.business?.slotMinutes {
            HStack {
              Text("Slot granularity").font(.caption).foregroundStyle(Theme.ink400)
              Spacer()
              Text("\(slotMin) min").font(.caption.weight(.semibold)).foregroundStyle(Theme.ink700)
            }
            .padding(14)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.ink100))
          }

          // Footer hint
          VStack(spacing: 6) {
            Image(systemName: "info.circle")
              .font(.title3)
              .foregroundStyle(Theme.ink400)
            Text("Edit hours on drevito.com → Settings")
              .font(.caption)
              .foregroundStyle(Theme.ink500)
          }
          .padding(.top, 12)
        }
        .padding(16)
      }
    }
    .navigationTitle("Working hours")
    .navigationBarTitleDisplayMode(.large)
  }

  private func dayRow(label: String, day: DaySchedule?) -> some View {
    HStack {
      Text(label)
        .font(.body.weight(.semibold))
        .foregroundStyle(day?.enabled == true ? Theme.ink800 : Theme.ink400)
      Spacer()
      if let day, day.enabled {
        Text("\(formatHour(day.open)) – \(formatHour(day.close))")
          .font(.body)
          .foregroundStyle(Theme.ink600)
      } else {
        Text("Closed")
          .font(.body)
          .foregroundStyle(Theme.ink400)
      }
    }
    .padding(14)
    .background(.white)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.ink100))
  }

  private func formatHour(_ h: Int) -> String {
    if h == 0 { return "12 AM" }
    if h == 12 { return "12 PM" }
    return h < 12 ? "\(h) AM" : "\(h - 12) PM"
  }
}
