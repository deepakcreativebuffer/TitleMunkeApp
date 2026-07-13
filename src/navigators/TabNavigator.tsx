import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  SearchHistoryScreen,
  ConversationListScreen,
  NearbySearchScreen,
} from '../screens';
import {HomeStackNavigator} from './HomeStackNavigator';
import {TabBar} from './TabBar';

const Tab = createBottomTabNavigator();

// Same four tabs for every role: Home, Search History, Messages, Nearby Search.
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{headerShown: false}}
      tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="SearchHistory" component={SearchHistoryScreen} />
      {/* These two are typed with native-stack props (also registered in the
          root stack), so cast for the bottom-tab component slot. */}
      <Tab.Screen
        name="Messages"
        component={ConversationListScreen as React.ComponentType}
      />
      <Tab.Screen
        name="NearbySearch"
        component={NearbySearchScreen as React.ComponentType}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
