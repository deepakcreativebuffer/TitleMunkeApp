import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {appColors, typography} from '../../global';
import {AppScreenProps} from '../../types';

export const LoginScreen = ({}: AppScreenProps<'LoginScreen'>) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      {/* TODO: Add form with react-hook-form + zod validation */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.background,
    paddingHorizontal: 24,
  },
  title: {
    ...typography('bold', 28, 'navyBlue'),
    marginBottom: 8,
  },
  subtitle: {
    ...typography('regular', 16, 'gray'),
  },
});
