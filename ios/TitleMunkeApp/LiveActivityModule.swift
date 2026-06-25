import Foundation
import React

#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(LiveActivityModule)
class LiveActivityModule: RCTEventEmitter {

  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    ["onLiveActivityPushToken"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: - Start

  @objc(startActivity:resolver:rejecter:)
  func startActivity(_ data: NSDictionary,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        reject("E_DISABLED", "Live Activities are disabled in Settings.", nil)
        return
      }
      let searchId = data["searchId"] as? String ?? ""
      let attributes = TitleSearchAttributes(
        address: data["address"] as? String ?? "",
        searchId: searchId
      )
      let state = Self.contentState(from: data, defaultStatus: "IN_PROGRESS")
      do {
        let activity: Activity<TitleSearchAttributes>
        if #available(iOS 16.2, *) {
          activity = try Activity.request(
            attributes: attributes,
            content: .init(state: state, staleDate: nil),
            pushType: .token
          )
        } else {
          activity = try Activity.request(
            attributes: attributes,
            contentState: state,
            pushType: .token
          )
        }
        resolve(activity.id)
        observePushToken(activity, searchId: searchId)
      } catch {
        reject("E_START", "Failed to start Live Activity: \(error.localizedDescription)", error)
      }
    } else {
      reject("E_UNSUPPORTED", "Live Activities require iOS 16.1+.", nil)
    }
    #else
    reject("E_UNSUPPORTED", "ActivityKit unavailable.", nil)
    #endif
  }

  // MARK: - Update

  @objc(updateActivity:data:resolver:rejecter:)
  func updateActivity(_ activityId: String,
                      data: NSDictionary,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      let state = Self.contentState(from: data, defaultStatus: "IN_PROGRESS")
      Task {
        for activity in Activity<TitleSearchAttributes>.activities where activity.id == activityId {
          if #available(iOS 16.2, *) {
            await activity.update(.init(state: state, staleDate: nil))
          } else {
            await activity.update(using: state)
          }
        }
        resolve(nil)
      }
    } else {
      reject("E_UNSUPPORTED", "Live Activities require iOS 16.1+.", nil)
    }
    #else
    reject("E_UNSUPPORTED", "ActivityKit unavailable.", nil)
    #endif
  }

  // MARK: - End

  @objc(endActivity:data:resolver:rejecter:)
  func endActivity(_ activityId: String,
                   data: NSDictionary,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      let state = Self.contentState(from: data, defaultStatus: "SUCCESS")
      Task {
        for activity in Activity<TitleSearchAttributes>.activities where activity.id == activityId {
          if #available(iOS 16.2, *) {
            await activity.end(.init(state: state, staleDate: nil), dismissalPolicy: .default)
          } else {
            await activity.end(using: state, dismissalPolicy: .default)
          }
        }
        resolve(nil)
      }
    } else {
      reject("E_UNSUPPORTED", "Live Activities require iOS 16.1+.", nil)
    }
    #else
    reject("E_UNSUPPORTED", "ActivityKit unavailable.", nil)
    #endif
  }

  @objc(endAll:rejecter:)
  func endAll(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(ActivityKit)
    if #available(iOS 16.1, *) {
      Task {
        for activity in Activity<TitleSearchAttributes>.activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
        resolve(nil)
      }
    } else {
      resolve(nil)
    }
    #else
    resolve(nil)
    #endif
  }

  // MARK: - Helpers

  #if canImport(ActivityKit)
  @available(iOS 16.1, *)
  private static func contentState(from data: NSDictionary,
                                   defaultStatus: String) -> TitleSearchAttributes.ContentState {
    TitleSearchAttributes.ContentState(
      status: data["status"] as? String ?? defaultStatus,
      percent: (data["percent"] as? NSNumber)?.intValue ?? 0,
      stageLabel: data["stageLabel"] as? String ?? "",
      message: data["message"] as? String ?? "",
      etaMinutes: (data["etaMinutes"] as? NSNumber)?.intValue ?? 0
    )
  }

  @available(iOS 16.1, *)
  private func observePushToken(_ activity: Activity<TitleSearchAttributes>, searchId: String) {
    Task {
      for await tokenData in activity.pushTokenUpdates {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        if hasListeners {
          sendEvent(withName: "onLiveActivityPushToken",
                    body: ["activityId": activity.id, "searchId": searchId, "token": token])
        }
      }
    }
  }
  #endif
}
