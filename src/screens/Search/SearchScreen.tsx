import React, {useMemo} from 'react';
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
import {CurrentUserAvatar} from '../../components/CurrentUserAvatar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../../global';
import {AppStackParamList} from '../../types';
import {useDrawer} from '../../context/DrawerContext';
import {useAppSelector} from '../../store';
import {
  userProfileSelector,
  userRoleSelector,
  currentSearchSelector,
} from '../../slices';
import {usePaginatedFetch} from '../../hooks';
import {searchStatusMeta} from '../../utils';
import {listSearchHistories} from '../../api/userAdmin.api';
import {SearchCard} from '../../components/SearchCard';

const gridBg = require('../../assets/images/grid-bg.png');
const icMenu = require('../../assets/images/ic-menu.png');
const icPin = require('../../assets/images/ic-pin.png');

const fmtWhen = (raw?: string | number): string => {
  if (!raw) {
    return '';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Pull raw history rows + pagination cursor out of one list-search-histories
// response ({ data: { listSearchHistories: { items, nextToken } } }).
const extractSearchPage = (
  res: any,
): {items: any[]; nextToken: string | null} => {
  const node = res?.data?.listSearchHistories ?? res?.listSearchHistories;
  const items = node?.items ?? res?.items ?? (Array.isArray(res) ? res : []);
  const nextToken = node?.nextToken ?? res?.nextToken ?? null;
  return {items, nextToken};
};

const mapRecentItems = (items: any[]) =>
  items.map((it, i) => ({
    id: String(it.id ?? it.search_id ?? i),
    address: it.address ?? '—',
    when: fmtWhen(it.created_at ?? it.createdAt),
    status: String(it.status ?? 'SUCCESS'),
    searchId: it.search_id ?? it.searchId ?? it.id,
  }));

// Load more when the scroll position gets within this many px of the bottom.
const LOAD_MORE_THRESHOLD = 320;

export const SearchScreen = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {openDrawer} = useDrawer();
  const profile = useAppSelector(userProfileSelector);
  const role = useAppSelector(userRoleSelector);
  const search = useAppSelector(currentSearchSelector);
  const userId = profile?.sub;

  // Recent searches — paginated (loads more as the user scrolls).
  const {
    items: recentRaw,
    loading,
    loadingMore,
    loadMore: loadMoreRecents,
  } = usePaginatedFetch(
    token =>
      listSearchHistories({
        userType: role,
        userId,
        limit: 10,
        ...(token ? {nextToken: token} : {}),
      }),
    extractSearchPage,
    // Re-fetch the first page when the user/role changes or a search completes.
    [role, userId, search.status],
  );
  const recents = useMemo(() => {
    const list = mapRecentItems(recentRaw);
    // Show the live search immediately (In Progress) before the backend list
    // includes it; status then updates live. Deduped by searchId.
    if (
      search.searchId &&
      search.status !== 'idle' &&
      !list.some(r => r.searchId === search.searchId)
    ) {
      list.unshift({
        id: `live-${search.searchId}`,
        address: search.address ?? '—',
        when: fmtWhen(search.startedAt ?? Date.now()),
        status: search.status,
        searchId: search.searchId,
      });
    }
    return list;
  }, [
    recentRaw,
    search.searchId,
    search.status,
    search.address,
    search.startedAt,
  ]);

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={e => {
          const {layoutMeasurement, contentOffset, contentSize} =
            e.nativeEvent;
          const distanceToBottom =
            contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (distanceToBottom < LOAD_MORE_THRESHOLD) {
            loadMoreRecents();
          }
        }}
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + scaleWidth(10)},
          {paddingBottom: insets.bottom + scaleWidth(110)},
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtnSquare}
            activeOpacity={0.8}
            onPress={openDrawer}>
            <Image source={icMenu} style={styles.headerIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity
            style={styles.iconBtnCircle}
            activeOpacity={0.8}
            onPress={() => nav.navigate('EditProfile')}>
            <CurrentUserAvatar
              size={scaleWidth(44)}
              fallbackIconStyle={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.greeting}>Run a new title search</Text>
        <Text style={styles.greetingSub}>
          Enter a property address to start a search
        </Text>

        <SearchCard />

        {/* Recent searches */}
        <View style={styles.recentHead}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
        </View>

        {loading && recents.length === 0 ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(20)}}
          />
        ) : recents.length === 0 ? (
          <View style={styles.recentEmpty}>
            <Text style={styles.recentEmptyText}>No recent searches yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {recents.map((r, i) => {
              const live =
                r.searchId && search.searchId === r.searchId
                  ? search.status
                  : r.status;
              const meta = searchStatusMeta(live);
              return (
                <View key={r.id}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      r.searchId &&
                      nav.navigate('PropertyReport', {
                        address: r.address,
                        when: r.when,
                        searchId: r.searchId,
                      })
                    }
                    style={styles.row}>
                    <View style={styles.rowPin}>
                      <Image source={icPin} style={styles.rowPinIcon} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowAddr} numberOfLines={1}>
                        {r.address}
                      </Text>
                      <Text style={styles.rowWhen}>{r.when}</Text>
                    </View>
                    <View style={[styles.pill, {backgroundColor: meta.bg}]}>
                      <Text style={[styles.pillText, {color: meta.color}]}>
                        {meta.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
        {loadingMore ? (
          <ActivityIndicator
            color={appColors.maroon}
            style={{marginTop: scaleWidth(14)}}
          />
        ) : null}
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
    marginBottom: scaleWidth(14),
  },
  iconBtnSquare: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  iconBtnCircle: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(44),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  headerIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.coffeeDark,
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  greeting: {...typography(700, 22, 'coffeeDark'), fontWeight: '700'},
  greetingSub: {
    ...typography('regular', 14, 'gray'),
    marginTop: scaleWidth(2),
    marginBottom: scaleWidth(18),
  },
  recentHead: {marginTop: scaleWidth(24), marginBottom: scaleWidth(12)},
  recentTitle: {...typography(700, 17, 'coffeeDark'), fontWeight: '700'},
  recentEmpty: {alignItems: 'center', paddingVertical: scaleWidth(28)},
  recentEmptyText: {...typography('regular', 14, 'gray')},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(18),
    paddingHorizontal: scaleWidth(16),
    ...shadow,
  },
  divider: {height: 1, backgroundColor: '#F1EDEA'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(14),
  },
  rowPin: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  rowPinIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroon,
  },
  rowBody: {flex: 1, paddingRight: scaleWidth(8)},
  rowAddr: {...typography(600, 15, 'coffeeDark'), fontWeight: '600'},
  rowWhen: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(3)},
  pill: {
    borderRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(5),
  },
  pillText: {...typography(600, 11, 'coffeeDark'), fontWeight: '600'},
});
