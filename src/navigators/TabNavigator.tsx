import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  SearchHistoryScreen,
  RequestsScreen,
  SettingsScreen,
} from '../screens';
import {HomeStackNavigator} from './HomeStackNavigator';
import {TabBar} from './TabBar';

const Tab = createBottomTabNavigator();

// Same four tabs for every role: Home, Search History, Requests, Settings.
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="SearchHistory" component={SearchHistoryScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
