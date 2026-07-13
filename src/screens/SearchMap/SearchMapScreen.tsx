import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, {
  Callout,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Region,
} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {geocodeMany, LatLng} from '../../api/geocode';
import {LogoMarker} from '../../components/LogoMarker';

const icChevron = require('../../assets/images/ic-chevron.png');

type Pin = {
  id: string;
  address: string;
  when: string;
  status: string;
  searchId?: string;
} & LatLng;

// Allentown / Lehigh County, PA — fallback center when nothing is mapped yet.
const FALLBACK_REGION: Region = {
  latitude: 40.6084,
  longitude: -75.4902,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

// Shared TitleMunke logo pin + this screen's report callout.
const PinMarker = ({p, onOpen}: {p: Pin; onOpen: () => void}) => (
  <LogoMarker
    coordinate={{latitude: p.latitude, longitude: p.longitude}}
    onPress={onOpen}>
    <Callout onPress={onOpen}>
      <View style={styles.callout}>
        <Text style={styles.calloutTitle} numberOfLines={2}>
          {p.address}
        </Text>
        {p.when ? <Text style={styles.calloutWhen}>{p.when}</Text> : null}
        <Text style={styles.calloutLink}>View property details ›</Text>
      </View>
    </Callout>
  </LogoMarker>
);

export const SearchMapScreen = ({
  navigation,
  route,
}: AppScreenProps<'SearchMap'>) => {
  const insets = useSafeAreaInsets();
  const items = useMemo(() => route.params?.items ?? [], [route.params]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Use the real lat/long from the search when present; geocode only the
  // addresses that are missing coordinates.
  useEffect(() => {
    let alive = true;
    (async () => {
      const withCoords: Pin[] = [];
      const needGeo: typeof items = [];
      items.forEach(it => {
        if (typeof it.latitude === 'number' && typeof it.longitude === 'number') {
          withCoords.push({
            ...it,
            latitude: it.latitude,
            longitude: it.longitude,
          } as Pin);
        } else {
          needGeo.push(it);
        }
      });
      const geocoded = needGeo.length ? await geocodeMany(needGeo) : [];
      if (alive) {
        setPins([...withCoords, ...(geocoded as Pin[])]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const initialRegion = useMemo<Region>(() => {
    if (!pins.length) {
      return FALLBACK_REGION;
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
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.5),
    };
  }, [pins]);

  // Once markers are in, zoom to fit them all.
  useEffect(() => {
    if (pins.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        pins.map(p => ({latitude: p.latitude, longitude: p.longitude})),
        {
          edgePadding: {top: 140, right: 80, bottom: 120, left: 80},
          animated: true,
        },
      );
    }
  }, [pins]);

  const openReport = (p: Pin) =>
    navigation.navigate('PropertyReport', {
      address: p.address,
      when: p.when,
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
        {pins.map(p => (
          <PinMarker key={p.id} p={p} onOpen={() => openReport(p)} />
        ))}
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
          <Text style={styles.title}>Search Locations</Text>
          {!loading ? (
            <Text style={styles.subtitle}>
              {pins.length} of {items.length} mapped
            </Text>
          ) : null}
        </View>
        {/* Transparent spacer to keep the title centered opposite the back button */}
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={appColors.maroon} />
          <Text style={styles.loadingText}>Locating your searches…</Text>
        </View>
      ) : pins.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No locations to show on the map yet.
            </Text>
          </View>
        </View>
      ) : null}
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
  headerSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: appColors.white,
    marginHorizontal: scaleWidth(10),
    paddingVertical: scaleWidth(8),
    borderRadius: scaleWidth(12),
    ...shadow,
  },
  title: {...typography(700, 16, 'coffeeDark'), fontWeight: '700'},
  subtitle: {...typography('regular', 11, 'gray'), marginTop: scaleWidth(2)},
  callout: {width: scaleWidth(200), padding: scaleWidth(4)},
  calloutTitle: {...typography(700, 13, 'coffeeDark'), fontWeight: '700'},
  calloutWhen: {
    ...typography('regular', 11, 'gray'),
    marginTop: scaleWidth(3),
  },
  calloutLink: {
    ...typography(600, 12, 'maroon'),
    fontWeight: '600',
    marginTop: scaleWidth(6),
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,251,236,0.6)',
  },
  loadingText: {
    ...typography(500, 13, 'coffeeDark'),
    fontWeight: '500',
    marginTop: scaleWidth(10),
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: appColors.white,
    paddingVertical: scaleWidth(14),
    paddingHorizontal: scaleWidth(20),
    borderRadius: scaleWidth(12),
    ...shadow,
  },
  emptyText: {...typography(500, 13, 'coffeeDark'), fontWeight: '500'},
});
