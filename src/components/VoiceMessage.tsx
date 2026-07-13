import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {appColors, typography, scaleWidth} from '../global';
import {
  startPlaying,
  pausePlaying,
  resumePlaying,
  stopPlaying,
  formatMillis,
} from '../services/audio';

// Only one voice note plays at a time — starting one resets the previously
// playing bubble's UI back to idle.
let activeReset: null | (() => void) = null;

interface Props {
  url: string;
  mine?: boolean;
  durationMs?: number;
}

export const VoiceMessage = ({url, mine, durationMs}: Props) => {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>(
    'idle',
  );
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(durationMs ?? 0);
  const startedRef = useRef(false);
  const resetRef = useRef<() => void>(() => {});

  resetRef.current = () => {
    startedRef.current = false;
    setState('idle');
    setPos(0);
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
      await startPlaying(url, (p, d) => {
        setState('playing');
        setPos(p);
        if (d) {
          setDur(d);
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

  const pct = dur > 0 ? Math.min(1, pos / dur) : 0;
  const tint = mine ? appColors.white : appColors.maroon;
  const trackBg = mine ? 'rgba(255,255,255,0.35)' : 'rgba(94,23,23,0.18)';
  const timeColor = mine ? 'rgba(255,255,255,0.85)' : appColors.gray;

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
        <View style={[styles.track, {backgroundColor: trackBg}]}>
          <View
            style={[
              styles.fill,
              {backgroundColor: tint, width: `${pct * 100}%`},
            ]}
          />
        </View>
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
    width: scaleWidth(200),
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
  track: {
    height: scaleWidth(4),
    borderRadius: scaleWidth(2),
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: scaleWidth(2)},
  time: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(5),
  },
});
