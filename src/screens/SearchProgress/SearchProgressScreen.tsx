import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  StatusBar,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {currentSearchSelector} from '../../slices';
import {
  buildStages,
  estimateRemainingMins,
  isTerminal,
} from '../../utils/searchStages';

// Live, food-delivery-style tracker for an in-flight title search. Reads the
// shared `search` slice (single source of truth), so it stays in sync with the
// 5s SearchManager poll and survives backgrounding / relaunch.
export const SearchProgressScreen = ({
  navigation,
}: AppScreenProps<'SearchProgress'>) => {
  const insets = useSafeAreaInsets();
  const search = useAppSelector(currentSearchSelector);
  const {status, percent, message, address, startedAt} = search;

  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED' || status === 'STOPPED';
  const terminal = isTerminal(status);
  const shownPercent = isSuccess ? 100 : Math.max(0, Math.min(100, percent));
  const stages = buildStages(status, percent);

  // Keep ETA fresh between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (terminal) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [terminal]);
  const etaMins = estimateRemainingMins(startedAt, percent, now);

  // Animate the progress bar width toward the current percent.
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: shownPercent,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [shownPercent, barAnim]);
  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Subtle pulse on the active stage dot.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (terminal) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [terminal, pulse]);
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const headerTitle = isSuccess
    ? 'Report Ready'
    : isFailed
    ? 'Search Stopped'
    : 'Tracking Your Search';

  const accent = isFailed ? appColors.error : appColors.maroon;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={appColors.background} />
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + scaleWidth(8)}]}>
        <TouchableOpacity
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {paddingBottom: insets.bottom + scaleWidth(24)},
        ]}>
        {/* Hero progress card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>
            {isSuccess
              ? 'YOUR TITLE REPORT IS READY'
              : isFailed
              ? 'THIS SEARCH DID NOT COMPLETE'
              : etaMins
              ? 'ESTIMATED TIME REMAINING'
              : 'SEARCH IN PROGRESS'}
          </Text>
          <Text style={[styles.heroBig, {color: accent}]}>
            {isSuccess
              ? 'Done'
              : isFailed
              ? 'Stopped'
              : etaMins
              ? `~${etaMins} min${etaMins > 1 ? 's' : ''}`
              : `${shownPercent}%`}
          </Text>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {width: barWidth, backgroundColor: accent},
              ]}
            />
          </View>
          <View style={styles.barMetaRow}>
            <Text style={styles.barPercent}>{shownPercent}%</Text>
            {address ? (
              <Text style={styles.barAddress} numberOfLines={1}>
                {address}
              </Text>
            ) : null}
          </View>

          {/* Live status message */}
          {message ? (
            <Text style={styles.liveMessage}>{message}</Text>
          ) : null}
        </View>

        {/* Stage timeline */}
        <View style={styles.timelineCard}>
          {stages.map((s, i) => {
            const last = i === stages.length - 1;
            const dotColor =
              s.state === 'pending' ? appColors.lightGray : accent;
            return (
              <View key={s.key} style={styles.stageRow}>
                {/* Rail */}
                <View style={styles.rail}>
                  {s.state === 'active' ? (
                    <Animated.View
                      style={[
                        styles.dotPulse,
                        {
                          backgroundColor: accent,
                          transform: [{scale: pulseScale}],
                        },
                      ]}
                    />
                  ) : null}
                  <View style={[styles.dot, {backgroundColor: dotColor}]}>
                    {s.state === 'done' ? (
                      <Text style={styles.dotCheck}>✓</Text>
                    ) : null}
                  </View>
                  {!last ? (
                    <View
                      style={[
                        styles.connector,
                        s.state === 'done' && {backgroundColor: accent},
                      ]}
                    />
                  ) : null}
                </View>
                {/* Label */}
                <View style={styles.stageLabelWrap}>
                  <Text
                    style={[
                      styles.stageLabel,
                      s.state === 'pending' && styles.stageLabelPending,
                      s.state === 'active' && {color: accent},
                    ]}>
                    {s.label}
                  </Text>
                  {s.state === 'active' && !terminal ? (
                    <Text style={styles.stageHint}>In progress…</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer hint while running */}
        {!terminal ? (
          <Text style={styles.leaveHint}>
            You can leave this screen — the search keeps running and we'll notify
            you when it's ready.
          </Text>
        ) : null}

        {/* CTAs */}
        {isSuccess ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.primaryBtn}
            onPress={() =>
              navigation.navigate('PropertyReport', {
                address: address ?? '',
                when: '',
                searchId: search.searchId ?? undefined,
              })
            }>
            <Text style={styles.primaryBtnText}>View Report</Text>
          </TouchableOpacity>
        ) : null}

        {isFailed ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryBtn, {backgroundColor: appColors.maroon}]}
            onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Back to Search</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const cardShadow = {
  shadowColor: '#3d2014',
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: appColors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(8),
  },
  backBtn: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: scaleWidth(34),
    color: appColors.coffeeDark,
    marginTop: -scaleWidth(4),
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  scroll: {paddingHorizontal: scaleWidth(18), paddingTop: scaleWidth(8)},
  heroCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(22),
    padding: scaleWidth(22),
    ...cardShadow,
  },
  heroLabel: {
    ...typography(600, 11, 'gray'),
    letterSpacing: 1,
    fontWeight: '600',
  },
  heroBig: {
    ...typography(700, 38, 'maroon'),
    fontWeight: '800',
    marginTop: scaleWidth(4),
  },
  barTrack: {
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
    backgroundColor: 'rgba(61,32,20,0.08)',
    marginTop: scaleWidth(16),
    overflow: 'hidden',
  },
  barFill: {height: '100%', borderRadius: scaleWidth(5)},
  barMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleWidth(10),
  },
  barPercent: {...typography(700, 13, 'coffeeDark'), fontWeight: '700'},
  barAddress: {
    ...typography('regular', 12, 'gray'),
    flex: 1,
    textAlign: 'right',
    marginLeft: scaleWidth(12),
  },
  liveMessage: {
    ...typography('regular', 13, 'coffeeLight'),
    marginTop: scaleWidth(14),
    lineHeight: scaleWidth(19),
  },
  timelineCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(22),
    padding: scaleWidth(22),
    marginTop: scaleWidth(16),
    ...cardShadow,
  },
  stageRow: {flexDirection: 'row'},
  rail: {width: scaleWidth(28), alignItems: 'center'},
  dot: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    borderRadius: scaleWidth(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    top: 0,
    width: scaleWidth(20),
    height: scaleWidth(20),
    borderRadius: scaleWidth(10),
    opacity: 0.25,
  },
  dotCheck: {
    color: appColors.white,
    fontSize: scaleWidth(12),
    fontWeight: '800',
    lineHeight: scaleWidth(15),
  },
  connector: {
    width: scaleWidth(2.5),
    flex: 1,
    minHeight: scaleWidth(26),
    backgroundColor: 'rgba(61,32,20,0.12)',
    marginVertical: scaleWidth(2),
  },
  stageLabelWrap: {
    flex: 1,
    paddingLeft: scaleWidth(12),
    paddingBottom: scaleWidth(18),
  },
  stageLabel: {
    ...typography(600, 15, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(1),
  },
  stageLabelPending: {color: appColors.gray, fontWeight: '400'},
  stageHint: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(3),
  },
  leaveHint: {
    ...typography('regular', 12, 'gray'),
    textAlign: 'center',
    marginTop: scaleWidth(18),
    paddingHorizontal: scaleWidth(10),
    lineHeight: scaleWidth(18),
  },
  primaryBtn: {
    height: scaleWidth(54),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(20),
  },
  primaryBtnText: {...typography(600, 16, 'white'), fontWeight: '700'},
});
