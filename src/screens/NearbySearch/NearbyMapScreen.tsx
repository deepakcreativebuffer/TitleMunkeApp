import React, {useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, {
  Marker,
  Callout,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Region,
} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {NearbyProperty} from '../../data/nearbyProperties';

const icChevron = require('../../assets/images/ic-chevron.png');

// Location-discovery map for Nearby Search. Shows pins + address names only —
// intentionally NO property details, price, owner, or images.
export const NearbyMapScreen = ({
  navigation,
  route,
}: AppScreenProps<'NearbyMap'>) => {
  const insets = useSafeAreaInsets();
  const {property, properties, title} = route.params ?? {};

  const pins: NearbyProperty[] = useMemo(
    () => (property ? [property] : properties ?? []),
    [property, properties],
  );

  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo<Region>(() => {
    if (!pins.length) {
      return {
        latitude: 40.6023,
        longitude: -75.4714,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }
    const lats = pins.map(p => p.latitude);
    const lngs = pins.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.5),
    };
  }, [pins]);

  // Auto-fit to show all markers.
  useEffect(() => {
    if (pins.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        pins.map(p => ({latitude: p.latitude, longitude: p.longitude})),
        {
          edgePadding: {top: 140, right: 80, bottom: 100, left: 80},
          animated: true,
        },
      );
    }
  }, [pins]);

  // Real properties (those with an `address`) open the full Property Report.
  const openDetail = (p: NearbyProperty) =>
    navigation.navigate('PropertyReport', {
      address: p.address ?? p.addressName,
      when: '',
      searchId: p.searchId,
    });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion}>
        {pins.map(p => {
          // Linkable to the Property Report only when we have a real searchId
          // (otherwise the report would load blank).
          const real = !!p.searchId;
          return (
            <Marker
              key={p.id}
              coordinate={{latitude: p.latitude, longitude: p.longitude}}
              pinColor={real ? appColors.success : appColors.maroon}
              title={p.addressName}
              description={p.area}
              onCalloutPress={real ? () => openDetail(p) : undefined}>
              <Callout onPress={real ? () => openDetail(p) : undefined}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {p.addressName}
                  </Text>
                  <Text style={styles.calloutArea} numberOfLines={1}>
                    {p.area}
                  </Text>
                  {real ? (
                    <Text style={styles.calloutLink}>
                      View property details ›
                    </Text>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <View style={[styles.header, {paddingTop: insets.top + scaleWidth(8)}]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}>
          <Image source={icChevron} style={styles.backIcon} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? 'Nearby Properties'}
          </Text>
          <Text style={styles.subtitle}>
            {pins.length === 1 ? '1 location' : `${pins.length} locations`}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
};

const shadow = {
  shadowColor: '#3d2014',
  shadowOffset: {width: 0, height: 6},
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 4,
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: appColors.background},
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleWidth(10),
  },
  backBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: appColors.white,
    marginHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(8),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scaleWidth(12),
    ...shadow,
  },
  title: {...typography(700, 16, 'coffeeDark'), fontWeight: '700'},
  subtitle: {...typography('regular', 11, 'gray'), marginTop: scaleWidth(2)},
  headerSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  callout: {width: scaleWidth(180), padding: scaleWidth(4)},
  calloutTitle: {...typography(700, 13, 'coffeeDark'), fontWeight: '700'},
  calloutArea: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(3),
  },
  calloutLink: {
    ...typography(600, 12, 'maroon'),
    fontWeight: '600',
    marginTop: scaleWidth(6),
  },
});
