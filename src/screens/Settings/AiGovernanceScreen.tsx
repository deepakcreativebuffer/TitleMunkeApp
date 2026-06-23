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
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {
  getAiModels,
  getDefaultAiModel,
  changeDefaultAiModel,
} from '../../api/llm.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');

export const AiGovernanceScreen = ({
  navigation,
}: AppScreenProps<'AiGovernance'>) => {
  const insets = useSafeAreaInsets();
  const profile = useAppSelector(userProfileSelector);
  const roleLower = (
    profile?.groups?.[0] ||
    profile?.role ||
    'admin'
  ).toLowerCase();
  const adminId = profile?.sub ?? '';

  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiModel, setAiModel] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [list, def] = await Promise.all([
          getAiModels(adminId, roleLower),
          getDefaultAiModel(adminId, roleLower),
        ]);
        const models = Array.isArray(list?.data)
          ? list.data
          : Array.isArray(list)
            ? list
            : [];
        setAiModels(models);
        const current =
          def?.[0]?.data?.llm_name ?? def?.data?.[0]?.data?.llm_name ?? '';
        if (current) {
          setAiModel(current);
        }
      } catch {
        /* leave empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [adminId, roleLower]);

  const onSelect = useCallback(
    async (m: string) => {
      setOpen(false);
      if (m === aiModel) {
        return;
      }
      const prev = aiModel;
      setAiModel(m); // optimistic
      setSaving(true);
      try {
        await changeDefaultAiModel(m, adminId, roleLower);
      } catch {
        setAiModel(prev);
        Alert.alert('Failed', 'Could not change the AI model.');
      } finally {
        setSaving(false);
      }
    },
    [aiModel, adminId, roleLower],
  );

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
        contentContainerStyle={[
          styles.scroll,
          {paddingTop: insets.top + scaleWidth(10)},
          {paddingBottom: insets.bottom + scaleWidth(24)},
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Governance</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Change AI Model</Text>
          <View style={styles.divider} />

          {loading ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginVertical: scaleWidth(8)}}
            />
          ) : (
            <View style={styles.modelWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={saving}
                style={styles.modelChip}
                onPress={() => setOpen(o => !o)}>
                <Text style={styles.modelChipText} numberOfLines={1}>
                  {aiModel || 'Select AI Model'}
                </Text>
                {saving ? (
                  <ActivityIndicator color={appColors.maroon} size="small" />
                ) : (
                  <Image
                    source={icChevron}
                    style={[
                      styles.modelChevron,
                      open && {transform: [{rotate: '-90deg'}]},
                    ]}
                  />
                )}
              </TouchableOpacity>
              {open ? (
                <View style={styles.dropdown}>
                  {aiModels.length === 0 ? (
                    <Text style={styles.empty}>No AI Models available</Text>
                  ) : (
                    aiModels.map(m => {
                      const active = m === aiModel;
                      return (
                        <TouchableOpacity
                          key={m}
                          activeOpacity={0.7}
                          style={styles.option}
                          onPress={() => onSelect(m)}>
                          <Text
                            style={[
                              styles.optionText,
                              active && styles.optionActive,
                            ]}>
                            {m}
                          </Text>
                          {active ? <Text style={styles.check}>✓</Text> : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          )}
        </View>
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
    marginBottom: scaleWidth(20),
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
  backBtnPlaceholder: {width: scaleWidth(44), height: scaleWidth(44)},
  backIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(20),
    zIndex: 30,
    ...shadow,
  },
  title: {...typography(700, 17, 'coffeeDark'), fontWeight: '700'},
  divider: {
    height: 1,
    backgroundColor: '#F1EDEA',
    marginVertical: scaleWidth(16),
  },
  modelWrap: {position: 'relative', zIndex: 40},
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: scaleWidth(50),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  modelChipText: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    marginRight: scaleWidth(8),
  },
  modelChevron: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.gray,
    transform: [{rotate: '90deg'}],
  },
  dropdown: {
    position: 'absolute',
    top: scaleWidth(54),
    left: 0,
    right: 0,
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingVertical: scaleWidth(4),
    zIndex: 50,
    elevation: 12,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(13),
  },
  optionText: {...typography(500, 14, 'coffeeDark'), fontWeight: '500'},
  optionActive: {...typography(600, 14, 'maroon'), fontWeight: '600'},
  check: {color: appColors.maroon, fontSize: scaleWidth(14), fontWeight: '700'},
  empty: {
    ...typography('regular', 13, 'gray'),
    textAlign: 'center',
    paddingVertical: scaleWidth(14),
  },
});
