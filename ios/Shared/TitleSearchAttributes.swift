import Foundation

#if canImport(ActivityKit)
import ActivityKit

// Shared between the app target (LiveActivityModule) and the widget extension
// (TitleSearchLiveActivity). MUST be a member of BOTH targets in Xcode.
@available(iOS 16.1, *)
struct TitleSearchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var status: String      // IN_PROGRESS | SUCCESS | FAILED | STOPPED
    var percent: Int        // 0...100
    var stageLabel: String  // e.g. "Analyzing title & deeds"
    var message: String     // live status message
    var etaMinutes: Int     // 0 when unknown
  }

  // Static data for the life of the activity.
  var address: String
  var searchId: String
}
#endif
