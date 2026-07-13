import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appColors, typography, scaleWidth} from '../global';
import {AppStackParamList} from '../types';
import {useAppDispatch, useAppSelector} from '../store';
import {currentSearchSelector} from '../slices';
import {startSearch} from '../thunks';
import {
  searchAddresses,
  hitAddress,
  algoliaEnabled,
  AddressHit,
} from '../api/algolia';

const icPin = require('../assets/images/ic-pin.png');
const icSearch = require('../assets/images/ic-search.png');

/**
 * Self-contained address title-search card. Used by the broker/agent dashboard
 * and the organisation Search screen. All search state lives in the redux
 * search slice (single source of truth), so the in-progress UI is consistent
 * everywhere and survives backgrounding / relaunch.
 */
export const SearchCard = () => {
  const dispatch = useAppDispatch();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const search = useAppSelector(currentSearchSelector);

  const [address, setAddress] = useState(() =>
    search.status === 'IN_PROGRESS' ? search.address ?? '' : '',
  );
  const [confirmed, setConfirmed] = useState(
    () => search.status === 'IN_PROGRESS',
  );
  const [error, setError] = useState<string | null>(null);
  const searching = search.status === 'IN_PROGRESS';

  const [suggestions, setSuggestions] = useState<AddressHit[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the address input + confirm checkbox so the card is ready for the
  // next search. Called both when a running search finishes (live transition)
  // and when the user returns to this screen after a finished search.
  const resetForm = useCallback(() => {
    setAddress('');
    setConfirmed(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
  }, []);

  // 1) Live case: the search finishes while this card is mounted/visible.
  const prevStatusRef = useRef(search.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = search.status;
    if (prev === 'IN_PROGRESS' && search.status !== 'IN_PROGRESS') {
      resetForm();
    }
  }, [search.status, resetForm]);

  // 2) Navigation case: the search finished on another screen (e.g. the live
  // tracker). When the user comes back here and nothing is running, clear it.
  useFocusEffect(
    useCallback(() => {
      if (search.status !== 'IN_PROGRESS' && search.status !== 'idle') {
        resetForm();
      }
    }, [search.status, resetForm]),
  );

  const onChangeAddress = useCallback((t: string) => {
    setAddress(t);
    setShowSuggestions(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!algoliaEnabled || !t.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const hits = await searchAddresses(t);
      setSuggestions(hits);
    }, 300);
  }, []);

  const onSelectSuggestion = useCallback((h: AddressHit) => {
    setAddress(hitAddress(h));
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const onSearch = useCallback(async () => {
    if (searching) {
      return;
    }
    if (!address.trim()) {
      setError('Please enter an address.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm the address is correct.');
      return;
    }
    setError(null);
    try {
      const res = await dispatch(startSearch({address: address.trim()})).unwrap();
      if (res?.searchId) {
        // Open the live tracker (progress bar + stage timeline). The search
        // keeps running server-side; the report is reachable from there.
        nav.navigate('SearchProgress');
      }
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Search failed to start.');
    }
  }, [address, confirmed, searching, dispatch, nav]);

  return (
    <View style={styles.searchCard}>
      <View style={styles.addressWrap}>
        <View style={[styles.addressInput, searching && styles.disabledBox]}>
          <Image source={icPin} style={styles.pinIcon} />
          <TextInput
            style={styles.addressText}
            value={address}
            onChangeText={onChangeAddress}
            onFocus={() => setShowSuggestions(true)}
            autoCorrect={false}
            editable={!searching}
            placeholder="Enter address here..."
            placeholderTextColor="rgba(142, 35, 35, 0.55)"
          />
          <TouchableOpacity
            style={[styles.inlineSearchBtn, searching && styles.searchBtnDisabled]}
            activeOpacity={0.85}
            disabled={searching}
            onPress={onSearch}>
            <Image source={icSearch} style={styles.inlineSearchIcon} />
          </TouchableOpacity>
        </View>
        {showSuggestions && suggestions.length > 0 ? (
          <View style={styles.suggestBox}>
            {suggestions.map((h, i) => (
              <TouchableOpacity
                key={(h.objectID as string) ?? i}
                activeOpacity={0.7}
                style={[styles.suggestRow, i > 0 && styles.suggestDivider]}
                onPress={() => onSelectSuggestion(h)}>
                <Image source={icPin} style={styles.suggestPin} />
                <Text style={styles.suggestText} numberOfLines={1}>
                  {hitAddress(h)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={styles.formatHint}>Format: 123 Hill St</Text>

      <TouchableOpacity
        style={[styles.confirmRow, searching && styles.disabledDim]}
        activeOpacity={0.8}
        disabled={searching}
        onPress={() => setConfirmed(c => !c)}>
        <View style={[styles.checkbox, confirmed && styles.checkboxOn]}>
          {confirmed ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.confirmText}>I confirm the address is correct</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.searchError}>{error}</Text> : null}

      {searching ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.progressBlock}
          disabled={!search.searchId}
          onPress={() => search.searchId && nav.navigate('SearchProgress')}>
          <Text style={styles.progressPercent}>
            Search in progress {search.percent ?? 0}%
          </Text>
          <Text style={styles.progressMessage}>
            {search.message || 'Initializing title search...'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
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
  searchCard: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(18),
    ...shadow,
  },
  addressWrap: {position: 'relative', zIndex: 20},
  addressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  suggestBox: {
    position: 'absolute',
    top: scaleWidth(56),
    left: 0,
    right: 0,
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingVertical: scaleWidth(4),
    zIndex: 30,
    elevation: 8,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleWidth(11),
    paddingHorizontal: scaleWidth(14),
  },
  suggestDivider: {borderTopWidth: 1, borderTopColor: 'rgba(61,32,20,0.06)'},
  suggestPin: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    tintColor: appColors.maroonLink,
    marginRight: scaleWidth(10),
  },
  suggestText: {flex: 1, ...typography('regular', 14, 'coffeeDark')},
  pinIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.maroonLink,
    marginRight: scaleWidth(10),
  },
  addressText: {flex: 1, ...typography('regular', 15, 'coffeeDark'), padding: 0},
  formatHint: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(12)},
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(16),
  },
  checkbox: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    borderRadius: scaleWidth(6),
    borderWidth: 1.8,
    borderColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  checkboxOn: {backgroundColor: appColors.maroon},
  checkboxMark: {
    color: appColors.white,
    fontSize: scaleWidth(13),
    fontWeight: '700',
    lineHeight: scaleWidth(16),
  },
  confirmText: {...typography('regular', 13, 'coffeeDark')},
  searchError: {
    ...typography('regular', 12, 'error'),
    marginBottom: scaleWidth(10),
  },
  // Icon-only search button sitting inside the address input, right side.
  inlineSearchBtn: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(10),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scaleWidth(8),
    marginRight: -scaleWidth(6),
  },
  inlineSearchIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.white,
    resizeMode: 'contain',
  },
  searchBtnDisabled: {opacity: 0.5},
  disabledBox: {backgroundColor: 'rgba(0,0,0,0.03)'},
  disabledDim: {opacity: 0.5},
  progressBlock: {alignItems: 'center', marginTop: scaleWidth(18)},
  progressPercent: {...typography(600, 15, 'coffeeDark'), fontWeight: '600'},
  progressMessage: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(8),
    textAlign: 'center',
  },
});
