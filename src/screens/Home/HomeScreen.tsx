import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {appColors, typography} from '../../global';

export const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
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
    ...typography('bold', 24, 'navyBlue'),
  },
});
