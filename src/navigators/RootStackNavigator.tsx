import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {AppNavigator} from './AppNavigator';
import {navigationRef} from './navigationRef';
import {DrawerProvider} from '../context/DrawerContext';
import {SearchManager} from '../components/SearchManager';

export const RootStackNavigator = () => (
  <NavigationContainer ref={navigationRef}>
    <DrawerProvider>
      <AppNavigator />
    </DrawerProvider>
    <SearchManager />
  </NavigationContainer>
);
