import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type AppStackParamList = {
  SplashScreen: undefined;
  LoginScreen: undefined;
  TabNavigator: undefined;
  // Add new screen routes here
};

// Helper type for screen props
export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;
