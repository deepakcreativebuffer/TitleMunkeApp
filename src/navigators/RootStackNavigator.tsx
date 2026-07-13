import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AppNavigator} from './AppNavigator';
import {navigationRef} from './navigationRef';
import {DrawerProvider} from '../context/DrawerContext';
import {SearchManager} from '../components/SearchManager';
import {MessagingManager} from '../components/MessagingManager';
import {LiveActivityManager} from '../components/LiveActivityManager';
import {AIChatBot} from '../components/AIChatBot';
import {AuthGate} from '../components/AuthGate';
import TabLevelSearchIndicator from '../components/TabLevelSearchIndicator';
import { useFCMListener } from '../hooks/useFCMListener';

export const RootStackNavigator = () =>{ 
  useFCMListener({
    onForegroundMessage(message) {
      console.log("GELLO", JSON.stringify(message))
    },
    onInitialNotification(message) {
      console.log("HELLOO<<<", JSON.stringify(message))
    },
    onNotificationOpened(message) {
      console.log("HELALAAL", JSON.stringify(message))
    },
  })
  return(
  <NavigationContainer ref={navigationRef}>
    <DrawerProvider>
      <AppNavigator />
    </DrawerProvider>
    <SearchManager />
    <MessagingManager />
    <LiveActivityManager />
    <TabLevelSearchIndicator/>
    <AIChatBot />
    <AuthGate />
  </NavigationContainer>
)};
