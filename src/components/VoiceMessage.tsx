import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
  Animated,
} from 'react-native';
import {appColors, typography, scaleWidth} from '../global';
import {
  startPlaying,
  pausePlaying,
  resumePlaying,
  stopPlaying,
  seekTo,
  formatMillis,
} from '../services/audio';
import {getCachedFileUri} from '../utils/imageCache';

// Only one voice note plays at a time — starting one resets the previously
// playing bubble's UI back to idle.
let activeReset: null | (() => void) = null;

const BAR_COUNT = 34;

// Deterministic pseudo-waveform from the url so each voice note has a stable,
// unique bar pattern (real amplitude samples aren't available from the recorder).
const buildBars = (seedStr: string): number[] => {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({length: BAR_COUNT}, () => 0.28 + rand() * 0.72);
};

interface Props {
  url: string;
  mine?: boolean;
  durationMs?: number;
  // Stable S3 key — the audio is downloaded once to disk and replayed locally
  // (no re-download / loading each time).
  fileKey?: string | null;
}

export const VoiceMessage = ({url, mine, durationMs, fileKey}: Props) => {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>(
    'idle',
  );
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(durationMs ?? 0);
  const [waveW, setWaveW] = useState(0);
  const startedRef = useRef(false);
  const resetRef = useRef<() => void>(() => {});
  // 0..1 progress, animated smoothly between the player's position updates.
  const progress = useRef(new Animated.Value(0)).current;

  const bars = useMemo(() => buildBars(url), [url]);

  resetRef.current = () => {
    startedRef.current = false;
    setState('idle');
    setPos(0);
    progress.stopAnimation();
    progress.setValue(0);
  };

  useEffect(() => {
    const reset = resetRef.current;
    return () => {
      if (activeReset === reset) {
        activeReset = null;
        void stopPlaying();
      }
    };
  }, []);

  const onToggle = async () => {
    try {
      if (state === 'playing') {
        await pausePlaying();
        setState('paused');
        return;
      }
      if (state === 'paused' && startedRef.current) {
        await resumePlaying();
        setState('playing');
        return;
      }
      // Start fresh — reset any other bubble that was playing.
      activeReset?.();
      activeReset = resetRef.current;
      startedRef.current = true;
      setState('loading');
      // Play the cached local copy (downloaded once) instead of re-streaming
      // the signed URL every time.
      const src = fileKey ? await getCachedFileUri(fileKey, url) : url;
      await startPlaying(src, (p, d) => {
        setState('playing');
        setPos(p);
        if (d) {
          setDur(d);
        }
        // Smoothly ease the fill toward the new position (bridges the gaps
        // between position updates → continuous WhatsApp-style motion).
        if (d > 0) {
          Animated.timing(progress, {
            toValue: Math.min(1, p / d),
            duration: 90,
            useNativeDriver: false,
          }).start();
        }
        // Near the end → finished.
        if (d && p >= d - 60) {
          void stopPlaying();
          resetRef.current();
          if (activeReset === resetRef.current) {
            activeReset = null;
          }
        }
      });
    } catch {
      resetRef.current();
    }
  };

  // Tap anywhere on the waveform to seek (only once playback has started).
  const onSeek = (e: GestureResponderEvent) => {
    if (!startedRef.current || dur <= 0 || waveW <= 0) {
      return;
    }
    const frac = Math.min(1, Math.max(0, e.nativeEvent.locationX / waveW));
    const ms = frac * dur;
    setPos(ms);
    progress.setValue(frac);
    void seekTo(ms);
  };

  const tint = mine ? appColors.white : appColors.maroon;
  const idleTint = mine ? 'rgba(255,255,255,0.45)' : 'rgba(94,23,23,0.28)';
  const timeColor = mine ? 'rgba(255,255,255,0.85)' : appColors.gray;
  const barStyle = (h: number) => ({
    width: scaleWidth(2),
    height: Math.max(scaleWidth(3), scaleWidth(22) * h),
    borderRadius: scaleWidth(1),
  });

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
        style={[styles.btn, {borderColor: tint}]}>
        {state === 'loading' ? (
          <ActivityIndicator size="small" color={tint} />
        ) : state === 'playing' ? (
          <View style={styles.pauseRow}>
            <View style={[styles.pauseBar, {backgroundColor: tint}]} />
            <View style={[styles.pauseBar, {backgroundColor: tint}]} />
          </View>
        ) : (
          <View style={[styles.playTri, {borderLeftColor: tint}]} />
        )}
      </TouchableOpacity>
      <View style={styles.mid}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onSeek}
          onLayout={e => setWaveW(e.nativeEvent.layout.width)}
          style={styles.wave}>
          {/* Base (unplayed) waveform */}
          {bars.map((h, i) => (
            <View key={i} style={[barStyle(h), {backgroundColor: idleTint}]} />
          ))}
          {/* Played overlay — same bars in full tint, clipped to the animated
              progress width so the fill glides smoothly left→right. */}
          {waveW > 0 ? (
            <Animated.View
              style={[
                styles.overlay,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, waveW],
                  }),
                },
              ]}>
              <View style={[styles.wave, {width: waveW}]}>
                {bars.map((h, i) => (
                  <View
                    key={i}
                    style={[barStyle(h), {backgroundColor: tint}]}
                  />
                ))}
              </View>
            </Animated.View>
          ) : null}
        </TouchableOpacity>
        <Text style={[styles.time, {color: timeColor}]}>
          {formatMillis(state === 'idle' ? dur : pos)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: scaleWidth(210),
    paddingVertical: scaleWidth(2),
  },
  btn: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  playTri: {
    width: 0,
    height: 0,
    marginLeft: scaleWidth(3),
    borderTopWidth: scaleWidth(6),
    borderBottomWidth: scaleWidth(6),
    borderLeftWidth: scaleWidth(10),
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pauseRow: {flexDirection: 'row'},
  pauseBar: {
    width: scaleWidth(3),
    height: scaleWidth(13),
    borderRadius: scaleWidth(1.5),
    marginHorizontal: scaleWidth(1.5),
  },
  mid: {flex: 1},
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: scaleWidth(24),
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: scaleWidth(24),
    overflow: 'hidden',
  },
  time: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(3),
  },
});
