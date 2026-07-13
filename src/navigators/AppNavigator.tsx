import React, {Suspense} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as Screens from '../screens';
import {AppStackParamList, AppScreenProps} from '../types';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator<AppStackParamList>();

// Lazy-load the map screen so react-native-maps (a native module) is only
// required when the user opens the map — never at app startup.
const LazySearchMap = React.lazy(() =>
  import('../screens/SearchMap/SearchMapScreen').then(m => ({
    default: m.SearchMapScreen,
  })),
);
const SearchMapScreen = (props: AppScreenProps<'SearchMap'>) => (
  <Suspense fallback={null}>
    <LazySearchMap {...props} />
  </Suspense>
);

// Nearby Search map — also lazy, for the same react-native-maps reason.
const LazyNearbyMap = React.lazy(() =>
  import('../screens/NearbySearch/NearbyMapScreen').then(m => ({
    default: m.NearbyMapScreen,
  })),
);
const NearbyMapScreen = (props: AppScreenProps<'NearbyMap'>) => (
  <Suspense fallback={null}>
    <LazyNearbyMap {...props} />
  </Suspense>
);

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
    <Stack.Screen
      name="SearchProgress"
      component={Screens.SearchProgressScreen}
    />
    <Stack.Screen name="SearchMap" component={SearchMapScreen} />
    <Stack.Screen
      name="NearbySearch"
      component={Screens.NearbySearchScreen}
      // The radius slider drags horizontally; disable swipe-back so it doesn't
      // trigger navigation. The header back button still works.
      options={{gestureEnabled: false}}
    />
    <Stack.Screen name="NearbyMap" component={NearbyMapScreen} />
    <Stack.Screen name="Messages" component={Screens.ConversationListScreen} />
    <Stack.Screen name="Chat" component={Screens.ChatScreen} />
    <Stack.Screen name="NewChat" component={Screens.NewChatScreen} />
    <Stack.Screen name="NewGroup" component={Screens.NewGroupScreen} />
    <Stack.Screen name="GroupInfo" component={Screens.GroupInfoScreen} />
    <Stack.Screen name="ContactInfo" component={Screens.ContactInfoScreen} />
    <Stack.Screen
      name="DocumentViewer"
      component={Screens.DocumentViewerScreen}
    />
    <Stack.Screen name="WebPage" component={Screens.WebPageScreen} />
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
    <Stack.Screen name="Requests" component={Screens.RequestsScreen} />
    <Stack.Screen name="Settings" component={Screens.SettingsScreen} />
    <Stack.Screen name="Logs" component={Screens.LogsScreen} />
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
