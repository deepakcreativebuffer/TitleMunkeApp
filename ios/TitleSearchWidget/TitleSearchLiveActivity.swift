import ActivityKit
import WidgetKit
import SwiftUI

// Brand colors (mirrors appColors in the RN theme).
private let brandMaroon = Color(red: 0.37, green: 0.09, blue: 0.09)   // #5E1717
private let brandSuccess = Color(red: 0.12, green: 0.53, blue: 0.29)  // #1E874B
private let brandError = Color(red: 0.86, green: 0.21, blue: 0.27)    // #DC3545
private let brandCoffee = Color(red: 0.24, green: 0.13, blue: 0.08)   // #3D2014

@available(iOS 16.1, *)
private func accentColor(_ status: String) -> Color {
  switch status {
  case "SUCCESS": return brandSuccess
  case "FAILED", "STOPPED": return brandError
  default: return brandMaroon
  }
}

@available(iOS 16.1, *)
private func clampedPercent(_ p: Int) -> Int { min(max(p, 0), 100) }

@available(iOS 16.1, *)
private func trailingText(_ state: TitleSearchAttributes.ContentState) -> String {
  switch state.status {
  case "SUCCESS": return "Done"
  case "FAILED", "STOPPED": return "Stopped"
  default:
    return state.etaMinutes > 0 ? "~\(state.etaMinutes)m" : "\(clampedPercent(state.percent))%"
  }
}

@available(iOS 16.1, *)
private func statusLabel(_ status: String) -> String {
  switch status {
  case "SUCCESS": return "READY"
  case "FAILED", "STOPPED": return "STOPPED"
  default: return "IN PROGRESS"
  }
}

@available(iOS 16.1, *)
struct TitleSearchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TitleSearchAttributes.self) { context in
      // Lock screen / banner presentation.
      LockScreenView(context: context)
        .padding(16)
        .activityBackgroundTint(Color.white.opacity(0.001))
    } dynamicIsland: { context in
      let state = context.state
      let accent = accentColor(state.status)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label("Title Search", systemImage: "doc.text.magnifyingglass")
            .font(.caption)
            .foregroundStyle(accent)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(trailingText(state)).font(.caption).bold().foregroundStyle(accent)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.address)
            .font(.caption2)
            .lineLimit(1)
            .foregroundStyle(.secondary)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            ProgressView(value: Double(clampedPercent(state.percent)), total: 100)
              .tint(accent)
            Text(state.stageLabel.isEmpty ? state.message : state.stageLabel)
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
      } compactLeading: {
        Image(systemName: "doc.text.magnifyingglass").foregroundStyle(accent)
      } compactTrailing: {
        Text(trailingText(state)).font(.caption2).foregroundStyle(accent)
      } minimal: {
        Text("\(clampedPercent(state.percent))%")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(accent)
      }
    }
  }
}

@available(iOS 16.1, *)
struct LockScreenView: View {
  let context: ActivityViewContext<TitleSearchAttributes>

  var body: some View {
    let state = context.state
    let accent = accentColor(state.status)
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        Image(systemName: "doc.text.magnifyingglass").foregroundStyle(accent)
        Text("Title Search").font(.subheadline).bold().foregroundStyle(brandCoffee)
        Spacer()
        Text(statusLabel(state.status))
          .font(.caption2).bold()
          .foregroundStyle(accent)
      }

      if !context.attributes.address.isEmpty {
        Text(context.attributes.address)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      ProgressView(value: Double(clampedPercent(state.percent)), total: 100)
        .tint(accent)

      HStack {
        Text(state.stageLabel.isEmpty ? state.message : state.stageLabel)
          .font(.caption2)
          .foregroundStyle(brandCoffee)
          .lineLimit(1)
        Spacer()
        Text(trailingText(state))
          .font(.caption2).bold()
          .foregroundStyle(.secondary)
      }
    }
  }
}
