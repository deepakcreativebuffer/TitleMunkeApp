import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type AppStackParamList = {
  SplashScreen: undefined;
  OnboardingScreen: undefined;
  LoginScreen: undefined;
  TabNavigator: undefined;
  PropertyReport: {address: string; when: string; searchId?: string};
  Agents: undefined;
  // Add new screen routes here
};

// Helper type for screen props
export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

// Nested stack inside the Home tab
export type HomeStackParamList = {
  Dashboard: undefined;
  SearchHistory: undefined;
};

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;
