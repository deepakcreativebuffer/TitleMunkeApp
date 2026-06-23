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
    <Stack.Screen
      name="ForgotPassword"
      component={Screens.ForgotPasswordScreen}
    />
    <Stack.Screen name="TabNavigator" component={TabNavigator} />
    <Stack.Screen
      name="PropertyReport"
      component={Screens.PropertyReportScreen}
    />
    <Stack.Screen name="Agents" component={Screens.AgentsScreen} />
    <Stack.Screen name="AddAgent" component={Screens.AddAgentScreen} />
    <Stack.Screen
      name="AgentDetails"
      component={Screens.AgentDetailsScreen}
    />
    <Stack.Screen name="EditProfile" component={Screens.EditProfileScreen} />
    <Stack.Screen
      name="ChangePassword"
      component={Screens.ChangePasswordScreen}
    />
    <Stack.Screen
      name="AiGovernance"
      component={Screens.AiGovernanceScreen}
    />
    <Stack.Screen
      name="AdvancedSettings"
      component={Screens.AdvancedSettingsScreen}
    />
    <Stack.Screen name="Search" component={Screens.SearchScreen} />
    <Stack.Screen name="OrgUsers" component={Screens.OrgUsersScreen} />
    <Stack.Screen name="AdminUsers" component={Screens.AdminUsersScreen} />
    <Stack.Screen name="AddOrgUser" component={Screens.AddOrgUserScreen} />
    <Stack.Screen
      name="BrokerDetails"
      component={Screens.BrokerDetailsScreen}
    />
    <Stack.Screen name="OrgDetails" component={Screens.OrgDetailsScreen} />
    <Stack.Screen
      name="AdminBrokerDetails"
      component={Screens.AdminBrokerDetailsScreen} />
  </Stack.Navigator>
);
