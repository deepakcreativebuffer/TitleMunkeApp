import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import {appColors, typography, scaleWidth} from '../global';

interface Props {
  options: number[]; // discrete stops, e.g. [5, 10, 20, 50, 100]
  value: number;
  onChange: (v: number) => void;
}

const THUMB = scaleWidth(28);
const BUBBLE_W = scaleWidth(64);

// Attractive discrete range slider that snaps to the given stops. Pure JS
// (PanResponder + Animated) so it needs no native module.
export const RadiusSlider = ({options, value, onChange}: Props) => {
  const n = options.length;
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);

  const index = Math.max(0, options.indexOf(value));
  const indexRef = useRef(index);
  indexRef.current = index;
  const startXRef = useRef(0);

  // Animated ratio 0..1 along the track.
  const anim = useRef(new Animated.Value(n > 1 ? index / (n - 1) : 0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: n > 1 ? index / (n - 1) : 0,
      useNativeDriver: false,
      bounciness: 8,
      speed: 16,
    }).start();
  }, [index, anim, n]);

  const setFromX = (x: number) => {
    const w = trackWRef.current;
    if (w <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, x / w));
    const idx = Math.round(ratio * (n - 1));
    if (idx !== indexRef.current) {
      onChange(options[idx]);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        startXRef.current = e.nativeEvent.locationX;
        setFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (_e, g) => {
        setFromX(startXRef.current + g.dx);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
  };

  const point = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackW],
  });
  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-THUMB / 2, trackW - THUMB / 2],
  });
  const bubbleLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-BUBBLE_W / 2, trackW - BUBBLE_W / 2],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.trackArea} onLayout={onLayout} {...pan.panHandlers}>
        {/* Value bubble */}
        <Animated.View style={[styles.bubbleWrap, {left: bubbleLeft}]}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{value} KM</Text>
          </View>
          <View style={styles.bubbleTip} />
        </Animated.View>

        {/* Track + fill */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, {width: point}]} />
        </View>

        {/* Stop ticks */}
        {trackW > 0 &&
          options.map((o, i) => (
            <View
              key={o}
              style={[
                styles.tick,
                {
                  left: (i / (n - 1)) * trackW - scaleWidth(3),
                  backgroundColor:
                    i <= index ? appColors.white : 'rgba(94,23,23,0.35)',
                },
              ]}
            />
          ))}

        {/* Thumb */}
        <Animated.View style={[styles.thumb, {left: thumbLeft}]}>
          <View style={styles.thumbInner} />
        </Animated.View>
      </View>

      {/* Stop labels */}
      <View style={styles.labels}>
        {options.map(o => (
          <Text
            key={o}
            style={[styles.labelText, o === value && styles.labelActive]}>
            {o}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {paddingTop: scaleWidth(34)},
  trackArea: {
    height: THUMB,
    justifyContent: 'center',
    marginHorizontal: THUMB / 2,
  },
  track: {
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
    backgroundColor: 'rgba(94,23,23,0.12)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(4),
  },
  tick: {
    position: 'absolute',
    width: scaleWidth(6),
    height: scaleWidth(6),
    borderRadius: scaleWidth(3),
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  thumbInner: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    borderRadius: scaleWidth(7),
    backgroundColor: appColors.maroon,
  },
  bubbleWrap: {
    position: 'absolute',
    top: -scaleWidth(30),
    width: BUBBLE_W,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(8),
    paddingVertical: scaleWidth(4),
    paddingHorizontal: scaleWidth(10),
  },
  bubbleText: {...typography(700, 13, 'white'), fontWeight: '700'},
  bubbleTip: {
    width: 0,
    height: 0,
    borderLeftWidth: scaleWidth(5),
    borderRightWidth: scaleWidth(5),
    borderTopWidth: scaleWidth(6),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: appColors.maroon,
    marginTop: -1,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: THUMB / 2,
    marginTop: scaleWidth(12),
  },
  labelText: {...typography(500, 12, 'gray'), fontWeight: '500'},
  labelActive: {color: appColors.maroon, fontWeight: '700'},
});
