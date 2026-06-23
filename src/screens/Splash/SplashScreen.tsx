import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {isAuthenticatedSelector} from '../../slices';

const logo = require('../../assets/images/logo.png');
const streetMap = require('../../assets/images/streetmap.png');

export const SplashScreen = ({navigation}: AppScreenProps<'SplashScreen'>) => {
  const progress = useRef(new Animated.Value(0)).current;
  const isAuthenticated = useAppSelector(isAuthenticatedSelector);

  useEffect(() => {
    // Looping indeterminate loading bar
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();

    // Route based on persisted auth state: logged-in users skip onboarding.
    const timer = setTimeout(() => {
      navigation.replace(
        isAuthenticated ? 'TabNavigator' : 'OnboardingScreen',
      );
    }, 2000);

    return () => {
      loop.stop();
      clearTimeout(timer);
    };
  }, [navigation, progress, isAuthenticated]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-TRACK_WIDTH, TRACK_WIDTH],
  });

  return (
    <ImageBackground
      source={streetMap}
      resizeMode="cover"
      style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />

      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.tagline}>
          Smarter Property Search.{'\n'}Verified. Accurate. Effortless.
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressBar, {transform: [{translateX}]}]}
        />
      </View>
    </ImageBackground>
  );
};

const TRACK_WIDTH = scaleWidth(96);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.background,
    paddingBottom: scaleWidth(56),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: scaleWidth(180),
    height: scaleWidth(193),
  },
  tagline: {
    ...typography('regular', 16, 'coffeeLight'),
    marginTop: scaleWidth(24),
    textAlign: 'center',
    lineHeight: scaleWidth(26),
  },
  progressTrack: {
    width: TRACK_WIDTH,
    height: scaleWidth(5),
    borderRadius: scaleWidth(5),
    backgroundColor: 'rgba(61, 32, 20, 0.15)',
    overflow: 'hidden',
  },
  progressBar: {
    width: '45%',
    height: '100%',
    borderRadius: scaleWidth(5),
    backgroundColor: appColors.coffeeDark,
  },
});
