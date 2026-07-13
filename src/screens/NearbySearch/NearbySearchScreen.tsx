import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {NearbyProperty} from '../../data/nearbyProperties';
import {RadiusSlider} from '../../components/RadiusSlider';
import {useAppSelector} from '../../store';
import {userProfileSelector, userRoleSelector} from '../../slices';
import {
  getNearbySearchProperties,
  listSearchHistories,
} from '../../api/userAdmin.api';
import {geocodeMany} from '../../api/geocode';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icPin = require('../../assets/images/ic-pin.png');

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

// Reference point for computing mock distances (Allentown / Lehigh Valley).
const ORIGIN = {latitude: 40.6023, longitude: -75.4714};

const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Map a raw property from /get-nearby-search-properties into a NearbyProperty.
// The backend shape is read defensively (snake/camel case + nested variants).
// Distance is computed from the search origin so it stays consistent with the
// KM display regardless of what the API returns. A searchId makes the entry
// report-linkable on the map.
const toNearbyProperty = (it: any, idx: number): NearbyProperty | null => {
  const latitude = Number(it?.latitude ?? it?.lat ?? it?.location?.lat);
  const longitude = Number(
    it?.longitude ?? it?.lng ?? it?.lon ?? it?.long ?? it?.location?.lng,
  );
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const address =
    it?.address ?? it?.property_address ?? it?.addressName ?? it?.name ?? '';
  const searchId = it?.searchId ?? it?.search_id ?? undefined;
  return {
    id: `api-${searchId ?? it?.id ?? idx}`,
    addressName: address || 'Property',
    area: it?.area ?? it?.city ?? it?.county ?? 'Nearby property',
    distance:
      Math.round(
        haversineKm(ORIGIN.latitude, ORIGIN.longitude, latitude, longitude) *
          10,
      ) / 10,
    latitude,
    longitude,
    ...(address ? {address} : {}),
    ...(searchId ? {searchId} : {}),
  };
};

export const NearbySearchScreen = ({
  navigation,
}: AppScreenProps<'NearbySearch'>) => {
  const insets = useSafeAreaInsets();
  const {openDrawer} = useDrawer();
  const profile = useAppSelector(userProfileSelector);
  const role = useAppSelector(userRoleSelector);
  const userId = profile?.sub;

  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NearbyProperty[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [realProps, setRealProps] = useState<NearbyProperty[]>([]);

  // Pull a few of the user's actual completed searches (real searchId +
  // address) and geocode them, so they appear as real, redirectable properties.
  useEffect(() => {
    if (!userId) {
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res: any = await listSearchHistories({
          userType: role,
          userId,
          limit: 10,
        });
        const items: any[] =
          res?.data?.listSearchHistories?.items ??
          res?.listSearchHistories?.items ??
          res?.items ??
          [];
        const candidates = items
          .map(it => ({
            address: it.address ?? it.searchAddress ?? '',
            searchId: it.search_id ?? it.searchId ?? it.id,
            status: String(it.status ?? ''),
          }))
          // Only completed searches have report data to show.
          .filter(
            c =>
              c.address &&
              c.searchId &&
              c.status.toUpperCase().includes('SUCCESS'),
          )
          .slice(0, 6);
        const geocoded = await geocodeMany(candidates);
        if (!alive) {
          return;
        }
        const props: NearbyProperty[] = geocoded.map((g, i) => ({
          id: `real-${g.searchId ?? i}`,
          addressName: g.address,
          area: 'Searched property',
          distance:
            Math.round(
              haversineKm(
                ORIGIN.latitude,
                ORIGIN.longitude,
                g.latitude,
                g.longitude,
              ) * 10,
            ) / 10,
          latitude: g.latitude,
          longitude: g.longitude,
          address: g.address,
          searchId: g.searchId,
        }));
        setRealProps(props);
      } catch {
        /* non-fatal — fall back to mock + hardcoded real entries */
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, role]);

  const onFind = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Ask the backend for properties within the chosen radius of the search
      // origin (radius is in KM in the UI, the API expects metres).
      const res: any = await getNearbySearchProperties({
        lat: ORIGIN.latitude,
        lng: ORIGIN.longitude,
        radiusMeters: radius * 1000,
        limit: 50,
      });
      const items: any[] =
        res?.data?.items ??
        res?.items ??
        res?.properties ??
        res?.data?.properties ??
        (Array.isArray(res) ? res : []);
      const apiProps = items
        .map(toNearbyProperty)
        .filter((p): p is NearbyProperty => p !== null);

      // Merge the user's real searches with the API results, de-duplicate by
      // address (preferring entries that carry a real searchId), then filter
      // by radius as a client-side guard and sort nearest-first.
      const byAddr = new Map<string, NearbyProperty>();
      [...realProps, ...apiProps].forEach(p => {
        const key = (p.address ?? p.addressName).toLowerCase().trim();
        const existing = byAddr.get(key);
        if (!existing || (!existing.searchId && p.searchId)) {
          byAddr.set(key, p);
        }
      });
      const found = [...byAddr.values()]
        .filter(p => p.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
      setResults(found);
    } catch {
      // Network/backend failure — show the empty state rather than stale data.
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [radius, realProps]);

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + scaleWidth(10)},
          {paddingBottom: insets.bottom + scaleWidth(110)},
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={openDrawer}>
            <Image source={icMenu} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nearby Search</Text>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              styles.mapBtn,
              results.length === 0 && styles.iconBtnDisabled,
            ]}
            activeOpacity={0.8}
            disabled={results.length === 0}
            onPress={() =>
              navigation.navigate('NearbyMap', {
                properties: results,
                title: 'Nearby Properties',
              })
            }>
            <Image source={icPin} style={styles.mapIcon} />
          </TouchableOpacity>
        </View>

        {/* Radius selector */}
        <View style={styles.card}>
          <View style={styles.radiusHead}>
            <Text style={styles.cardLabel}>SEARCH RADIUS</Text>
            <Text style={styles.radiusValue}>{radius} KM</Text>
          </View>
          <RadiusSlider
            options={RADIUS_OPTIONS}
            value={radius}
            onChange={setRadius}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.cta, loading && styles.ctaDisabled]}
            disabled={loading}
            onPress={onFind}>
            {loading ? (
              <ActivityIndicator color={appColors.white} />
            ) : (
              <>
                <Image source={icPin} style={styles.ctaIcon} />
                <Text style={styles.ctaText}>Find Nearby Properties</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={appColors.maroon} />
            <Text style={styles.centerText}>
              Searching properties within {radius} KM…
            </Text>
          </View>
        ) : !hasSearched ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>
              Pick a radius and tap “Find Nearby Properties”.
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.centerText}>
              No properties found within {radius} KM.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {results.length} properties within {radius} KM
            </Text>
            {results.map(p => (
              <View key={p.id} style={styles.propCard}>
                <View style={styles.propTop}>
                  <View style={styles.propIcon}>
                    <Image source={icPin} style={styles.propPin} />
                  </View>
                  <View style={styles.propInfo}>
                    <Text style={styles.propName} numberOfLines={1}>
                      {p.addressName}
                    </Text>
                    <Text style={styles.propArea} numberOfLines={1}>
                      {p.area}
                    </Text>
                    {p.searchId ? (
                      <View style={styles.reportTag}>
                        <Text style={styles.reportTagText}>Report available</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.propDistance}>
                    {p.distance.toFixed(1)} KM
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.viewMapBtn}
                  onPress={() =>
                    navigation.navigate('NearbyMap', {
                      property: p,
                      title: p.addressName,
                    })
                  }>
                  <Image source={icPin} style={styles.viewMapIcon} />
                  <Text style={styles.viewMapText}>View on Map</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ImageBackground>
  );
};

const shadow = {
  shadowColor: '#3d2014',
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

const styles = StyleSheet.create({
  bg: {flex: 1, backgroundColor: appColors.background},
  scroll: {paddingHorizontal: scaleWidth(20)},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(16),
  },
  iconBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  iconBtnDisabled: {opacity: 0.5},
  mapBtn: {backgroundColor: appColors.maroon},
  backIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  mapIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.white,
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    padding: scaleWidth(18),
    marginBottom: scaleWidth(18),
    ...shadow,
  },
  radiusHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography(600, 11, 'gray'),
    letterSpacing: 1,
    fontWeight: '600',
  },
  radiusValue: {...typography(700, 15, 'maroon'), fontWeight: '700'},
  cta: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(18),
  },
  ctaDisabled: {opacity: 0.75},
  ctaIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.white,
    marginRight: scaleWidth(8),
  },
  ctaText: {...typography(600, 16, 'white'), fontWeight: '600'},
  center: {alignItems: 'center', marginTop: scaleWidth(40)},
  centerText: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    marginTop: scaleWidth(10),
    textAlign: 'center',
  },
  resultsCount: {
    ...typography(600, 13, 'coffeeLight'),
    fontWeight: '600',
    marginBottom: scaleWidth(12),
  },
  propCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(14),
    marginBottom: scaleWidth(12),
    ...shadow,
  },
  propTop: {flexDirection: 'row', alignItems: 'center'},
  propIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(12),
    backgroundColor: 'rgba(94,23,23,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  propPin: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
  propInfo: {flex: 1},
  propName: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  propArea: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(2),
  },
  reportTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,135,75,0.12)',
    borderRadius: scaleWidth(6),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleWidth(3),
    marginTop: scaleWidth(6),
  },
  reportTagText: {...typography(600, 10, 'success'), fontWeight: '700', letterSpacing: 0.3},
  propDistance: {
    ...typography(700, 13, 'maroon'),
    fontWeight: '700',
    marginLeft: scaleWidth(8),
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scaleWidth(40),
    borderRadius: scaleWidth(10),
    backgroundColor: 'rgba(94,23,23,0.07)',
    marginTop: scaleWidth(12),
  },
  viewMapIcon: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroon,
    marginRight: scaleWidth(7),
  },
  viewMapText: {...typography(600, 13, 'maroon'), fontWeight: '600'},
});
