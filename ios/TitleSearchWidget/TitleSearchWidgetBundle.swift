import WidgetKit
import SwiftUI

// Entry point for the widget extension. Only registers the Live Activity (no
// home-screen widgets), gated to iOS 16.1+ where ActivityKit exists.
@main
struct TitleSearchWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 16.1, *) {
      TitleSearchLiveActivity()
    }
  }
}
