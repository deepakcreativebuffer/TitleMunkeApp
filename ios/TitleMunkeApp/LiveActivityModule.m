#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Bridges the Swift `LiveActivityModule` (RCTEventEmitter) to React Native.
@interface RCT_EXTERN_MODULE(LiveActivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSString *)activityId
                  data:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endActivity:(NSString *)activityId
                  data:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endAll:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
