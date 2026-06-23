import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen, SearchHistoryScreen} from '../screens';
import {HomeStackParamList} from '../types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{headerShown: false, animation: 'ios_from_right'}}>
    <Stack.Screen name="Dashboard" component={HomeScreen} />
    <Stack.Screen name="SearchHistory" component={SearchHistoryScreen} />
  </Stack.Navigator>
);
