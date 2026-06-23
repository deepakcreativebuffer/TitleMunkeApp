import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth, SCREEN_WIDTH} from '../../global';
import {AppScreenProps} from '../../types';

const gridBg = require('../../assets/images/grid-bg.png');

type Slide = {
  key: string;
  title: string;
  description: string;
  image: number;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    title: 'AI Powered\nProperty Search',
    description: 'Search property records instantly with accuracy and speed.',
    image: require('../../assets/images/onboarding-1.png'),
    cta: 'Next',
  },
  {
    key: '2',
    title: 'Verified Records.\nTrusted Results.',
    description:
      'Get verified title reports and official property information in seconds.',
    image: require('../../assets/images/onboarding-2.png'),
    cta: 'Next',
  },
  {
    key: '3',
    title: 'Covering Counties\nAcross the Nation',
    description:
      'Access property records across multiple counties and states.',
    image: require('../../assets/images/onboarding-3.png'),
    cta: 'Get Started',
  },
];

export const OnboardingScreen = ({
  navigation,
}: AppScreenProps<'OnboardingScreen'>) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setIndex(next);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToOffset({
        offset: (index + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setIndex(index + 1);
    } else {
      navigation.replace('LoginScreen');
    }
  }, [index, navigation]);

  const renderItem = ({item}: ListRenderItemInfo<Slide>) => (
    <View style={styles.slide}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.description}</Text>
      </View>
      <View style={styles.illoWrap}>
        <Image source={item.image} style={styles.illo} resizeMode="contain" />
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={gridBg}
      resizeMode="cover"
      style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />

      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onScrollEnd}
      />

      <View style={[styles.footer, {paddingBottom: insets.bottom + 24}]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.button}
          onPress={handleNext}>
          <Text style={styles.buttonText}>{SLIDES[index].cta}</Text>
          {index < SLIDES.length - 1 ? (
            <Text style={styles.buttonArrow}>{'→'}</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    overflow: 'hidden',
  },
  textBlock: {
    paddingHorizontal: scaleWidth(28),
    paddingTop: scaleWidth(24),
  },
  title: {
    ...typography(700, 27, 'coffeeDark'),
    fontWeight: '700',
    lineHeight: scaleWidth(34),
    letterSpacing: 0.2,
  },
  subtitle: {
    ...typography('regular', 14, 'coffeeLight'),
    lineHeight: scaleWidth(21),
    marginTop: scaleWidth(12),
    opacity: 0.8,
  },
  illoWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  illo: {
    width: SCREEN_WIDTH * 0.96,
    height: SCREEN_WIDTH * 0.96 * (860 / 1080),
  },
  footer: {
    paddingHorizontal: scaleWidth(28),
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleWidth(28),
  },
  dot: {
    width: scaleWidth(9),
    height: scaleWidth(9),
    borderRadius: scaleWidth(9),
    backgroundColor: 'rgba(61, 32, 20, 0.18)',
    marginHorizontal: scaleWidth(5),
  },
  dotActive: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.coffeeDark,
  },
  button: {
    height: scaleWidth(54),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.coffeeDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonArrow: {
    ...typography('regular', 18, 'white'),
    position: 'absolute',
    right: scaleWidth(22),
  },
});
