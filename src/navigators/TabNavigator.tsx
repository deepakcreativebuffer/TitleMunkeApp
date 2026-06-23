import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RequestsScreen, LogsScreen, SettingsScreen} from '../screens';
import {HomeStackNavigator} from './HomeStackNavigator';
import {TabBar} from './TabBar';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Logs" component={LogsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
