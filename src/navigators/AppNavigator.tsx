import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as Screens from '../screens';
import {AppStackParamList} from '../types';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => (
  <Stack.Navigator
    screenOptions={{headerShown: false, animation: 'ios_from_right'}}
    initialRouteName="SplashScreen">
    <Stack.Screen name="SplashScreen" component={Screens.SplashScreen} />
    <Stack.Screen
      name="OnboardingScreen"
      component={Screens.OnboardingScreen}
    />
    <Stack.Screen name="LoginScreen" component={Screens.LoginScreen} />
    <Stack.Screen name="TabNavigator" component={TabNavigator} />
    <Stack.Screen
      name="PropertyReport"
      component={Screens.PropertyReportScreen}
    />
    <Stack.Screen name="Agents" component={Screens.AgentsScreen} />
  </Stack.Navigator>
);
