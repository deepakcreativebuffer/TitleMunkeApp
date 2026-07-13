import React, {useState} from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {Marker} from 'react-native-maps';
import {appColors, scaleWidth} from '../global';

const logoIcon = require('../assets/images/logo-icon.png');

interface Props {
  coordinate: {latitude: number; longitude: number};
  onPress?: () => void;
  children?: React.ReactNode; // Optional <Callout>
}

// Custom TitleMunke map pin: white balloon head with a maroon ring, the brand
// logo inside, and a pointed maroon tip anchored on the coordinate. Shared by
// every map (Search History, Nearby). `tracksViewChanges` is turned off once
// the logo has rendered so the marker is snapshotted (keeps the map smooth).
export const LogoMarker = ({coordinate, onPress, children}: Props) => {
  const [track, setTrack] = useState(true);
  return (
    <Marker
      coordinate={coordinate}
      onCalloutPress={onPress}
      tracksViewChanges={track}
      anchor={{x: 0.5, y: 1}}
      calloutAnchor={{x: 0.5, y: 0}}>
      <View style={styles.pin}>
        <View style={styles.pinHead}>
          <Image
            source={logoIcon}
            style={styles.pinLogo}
            resizeMode="contain"
            onLoad={() => setTrack(false)}
          />
        </View>
        <View style={styles.pinTip} />
      </View>
      {children}
    </Marker>
  );
};

const styles = StyleSheet.create({
  pin: {alignItems: 'center'},
  pinHead: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(19),
    backgroundColor: appColors.white,
    borderWidth: scaleWidth(2.5),
    borderColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  pinLogo: {
    width: scaleWidth(26),
    height: scaleWidth(26),
  },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -scaleWidth(3),
    borderLeftWidth: scaleWidth(7),
    borderRightWidth: scaleWidth(7),
    borderTopWidth: scaleWidth(12),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: appColors.maroon,
  },
});
