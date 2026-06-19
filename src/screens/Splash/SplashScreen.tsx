import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {appColors, typography} from '../../global';
import {AppScreenProps} from '../../types';

export const SplashScreen = ({navigation}: AppScreenProps<'SplashScreen'>) => {
  useEffect(() => {
    // Simulate loading / auth check
    const timer = setTimeout(() => {
      // TODO: Check if user is logged in, then navigate accordingly
      navigation.replace('LoginScreen');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TitleMunke</Text>
      <ActivityIndicator
        size="large"
        color={appColors.primaryGreen}
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.background,
  },
  title: {
    ...typography('bold', 32, 'navyBlue'),
  },
  loader: {
    marginTop: 24,
  },
});
