// src/hooks/useFCMListener.ts

import {useEffect} from 'react';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

type Props = {
  onForegroundMessage?: (
    message: FirebaseMessagingTypes.RemoteMessage,
  ) => void;
  onNotificationOpened?: (
    message: FirebaseMessagingTypes.RemoteMessage,
  ) => void;
  onInitialNotification?: (
    message: FirebaseMessagingTypes.RemoteMessage,
  ) => void;
};

export const useFCMListener = ({
  onForegroundMessage,
  onNotificationOpened,
  onInitialNotification,
}: Props = {}) => {
  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(
      async remoteMessage => {
        onForegroundMessage?.(remoteMessage);
      },
    );

    const unsubscribeOpened = messaging().onNotificationOpenedApp(
      remoteMessage => {
        onNotificationOpened?.(remoteMessage);
      },
    );

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          onInitialNotification?.(remoteMessage);
        }
      });

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [
    onForegroundMessage,
    onNotificationOpened,
    onInitialNotification,
  ]);
};