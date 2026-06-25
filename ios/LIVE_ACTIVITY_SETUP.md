# Live Activity (lock screen + Dynamic Island) — setup

The app/JS code is done. These steps wire up the native iOS pieces. Live
Activities need **iOS 16.1+** and a **real device** (recommended) or iOS 16.1+
simulator. Requires a **paid Apple Developer account** (push + capabilities).

Files already written:

| File | Belongs to target |
|------|-------------------|
| `ios/Shared/TitleSearchAttributes.swift` | **BOTH** app + widget |
| `ios/TitleMunkeApp/LiveActivityModule.swift` | App (`TitleMunkeApp`) |
| `ios/TitleMunkeApp/LiveActivityModule.m` | App (`TitleMunkeApp`) |
| `ios/TitleSearchWidget/TitleSearchWidgetBundle.swift` | Widget |
| `ios/TitleSearchWidget/TitleSearchLiveActivity.swift` | Widget |
| `ios/TitleSearchWidget/Info.plist` | Widget |

`NSSupportsLiveActivities = YES` is already set in `ios/TitleMunkeApp/Info.plist`.

---

## 1. Add the bridge files to the app target

Open `ios/TitleMunkeApp.xcworkspace` in Xcode.

1. Right-click the **TitleMunkeApp** group → **Add Files to "TitleMunkeApp"…**
2. Add `LiveActivityModule.swift` and `LiveActivityModule.m`, target = **TitleMunkeApp**.
3. If Xcode offers to create a **Swift bridging header**, click **Create**.
   (The app already has a Swift `AppDelegate`, so one may already exist.)

> If `import React` fails to compile in `LiveActivityModule.swift`, add
> `#import <React/RCTEventEmitter.h>` and `#import <React/RCTBridgeModule.h>`
> to the bridging header instead and remove `import React`.

## 2. Create the Widget Extension target

1. **File → New → Target… → Widget Extension**.
2. Product name: **TitleSearchWidget**. **Uncheck** "Include Configuration
   App Intent". **Check** "Include Live Activity" if offered. Finish.
   When asked to activate the scheme, click **Activate**.
3. Xcode generates template files. **Delete** the generated `.swift` files
   (move to trash) but **keep** the target and its `Info.plist`.
4. Replace the target's `Info.plist` content with our `TitleSearchWidget/Info.plist`
   (or just point the target's Info.plist build setting at it).
5. Right-click the **TitleSearchWidget** group → **Add Files** →
   add `TitleSearchWidgetBundle.swift` and `TitleSearchLiveActivity.swift`,
   target = **TitleSearchWidget** only.
6. Set the widget target's **Minimum Deployments** to iOS **16.1**.

## 3. Share the attributes file with BOTH targets

1. Select `ios/Shared/TitleSearchAttributes.swift` in Xcode.
2. In the **File Inspector** (right panel) → **Target Membership**, check
   **BOTH** `TitleMunkeApp` **and** `TitleSearchWidget`.

   This is the most common mistake — if it's only in one target, you'll get
   "cannot find type 'TitleSearchAttributes'".

## 4. Capabilities

On the **TitleMunkeApp** target → **Signing & Capabilities**:
- **+ Capability → Push Notifications** (also needed for FCM).
- **+ Capability → Background Modes** → check **Remote notifications**.

The widget target needs no special capability.

## 5. Build

```bash
cd ios && pod install && cd ..
npx react-native run-ios   # or run on a device from Xcode
```

To test the UI quickly: start a search in the app → the activity appears on the
lock screen and (iPhone 14 Pro+ / 15 Pro+) in the Dynamic Island. While the app
is open it updates locally every poll. For updates while the app is **closed**,
the backend must push (below).

---

## 6. Backend contract — APNs Live Activity push

When a search starts, the app registers the activity's push token:

```
POST /add-live-activity-token
{ "search_id": "...", "push_token": "<hex>", "activity_id": "..." }
```

Backend stores `(search_id → push_token)` and, as the search progresses, sends
**APNs Live Activity pushes** to that token.

**Endpoint:** `https://api.push.apple.com/3/device/<push_token>`
(`https://api.sandbox.push.apple.com` for dev builds).

**Headers:**
```
:method            POST
apns-push-type     liveactivity
apns-topic         com.app.titleMunke.push-type.liveactivity
apns-priority      10
authorization      bearer <JWT signed with your APNs .p8 key>
```

**Update payload** (the `content-state` keys MUST match exactly):
```json
{
  "aps": {
    "timestamp": 1719240000,
    "event": "update",
    "content-state": {
      "status": "IN_PROGRESS",
      "percent": 45,
      "stageLabel": "Analyzing title & deeds",
      "message": "Pulling deed records…",
      "etaMinutes": 3
    },
    "alert": { "title": "Title Search", "body": "45% complete" }
  }
}
```

**End payload** (when status becomes SUCCESS / FAILED / STOPPED):
```json
{
  "aps": {
    "timestamp": 1719240600,
    "event": "end",
    "dismissal-date": 1719244200,
    "content-state": {
      "status": "SUCCESS", "percent": 100,
      "stageLabel": "Report ready", "message": "Your report is ready.",
      "etaMinutes": 0
    }
  }
}
```

Notes:
- `apns-topic` = `<app bundle id>.push-type.liveactivity` → here
  `com.app.titleMunke.push-type.liveactivity`.
- Reuse the same APNs **.p8 key** uploaded for FCM/normal push.
- Stage labels the app uses: `Initializing search`, `Fetching county records`,
  `Analyzing title & deeds`, `Compiling your report`, `Report ready`
  (see `src/utils/searchStages.ts`).
