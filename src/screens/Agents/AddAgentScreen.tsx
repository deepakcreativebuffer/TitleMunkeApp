import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {userProfileSelector} from '../../slices';
import {createAgent, updateAgentDetail} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');

const LIMITS = ['10', '20', '30', '50', '100', 'unlimited'];
const limitLabel = (l: string) => (l === 'unlimited' ? 'Unlimited' : l);

export const AddAgentScreen = ({
  navigation,
  route,
}: AppScreenProps<'AddAgent'>) => {
  const insets = useSafeAreaInsets();
  const profile = useAppSelector(userProfileSelector);
  const brokerId = profile?.sub;
  const editing = route.params?.agent;
  const isEdit = !!editing?.id;

  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [searchLimit, setSearchLimit] = useState(editing?.searchLimit || '10');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter the full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && editing) {
        await updateAgentDetail({
          id: editing.id,
          name: name.trim(),
          email: email.trim(),
          searchLimit,
        });
      } else {
        await createAgent({
          name: name.trim(),
          email: email.trim(),
          searchLimit: (Number(searchLimit) || searchLimit) as any,
          brokerId: brokerId as string,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Text style={styles.headerTitle}>
              {isEdit ? 'Edit Agent' : 'Add Agent'}
            </Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="John Marks"
              placeholderTextColor={appColors.gray}
              editable={!saving}
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, isEdit && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              placeholder="agent@example.com"
              placeholderTextColor={appColors.gray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              // Email is the account identity — can't be changed when editing.
              editable={!saving && !isEdit}
            />

            <Text style={styles.label}>Monthly Search Limit</Text>
            <View style={styles.chips}>
              {LIMITS.map(l => {
                const active = searchLimit === l;
                return (
                  <TouchableOpacity
                    key={l}
                    activeOpacity={0.85}
                    disabled={saving}
                    onPress={() => setSearchLimit(l)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}>
                      {limitLabel(l)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={saving}
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={saving}
                style={[styles.btn, styles.submitBtn]}
                onPress={onSubmit}>
                {saving ? (
                  <ActivityIndicator color={appColors.white} />
                ) : (
                  <Text style={styles.submitText}>
                    {isEdit ? 'Update Agent' : 'Invite Agent'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {flex: 1},
  bg: {flex: 1, backgroundColor: appColors.background},
  scroll: {paddingHorizontal: scaleWidth(20)},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(18),
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
  backBtnPlaceholder: {
    width: scaleWidth(44),
    height: scaleWidth(44),
  },
  backIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },

  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(20),
    ...shadow,
  },
  label: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginBottom: scaleWidth(8),
    marginTop: scaleWidth(16),
  },
  input: {
    height: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    ...typography('regular', 15, 'coffeeDark'),
  },
  inputDisabled: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    color: appColors.gray,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleWidth(10),
    borderRadius: scaleWidth(10),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    backgroundColor: appColors.white,
    marginRight: scaleWidth(8),
    marginBottom: scaleWidth(8),
  },
  chipActive: {
    backgroundColor: appColors.maroon,
    borderColor: appColors.maroon,
  },
  chipText: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
  },
  chipTextActive: {
    color: appColors.white,
  },
  error: {
    ...typography('regular', 13, 'error'),
    marginTop: scaleWidth(10),
  },
  actions: {
    flexDirection: 'row',
    marginTop: scaleWidth(24),
  },
  btn: {
    flex: 1,
    height: scaleWidth(52),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: appColors.maroon,
    marginRight: scaleWidth(6),
  },
  cancelText: {
    ...typography(600, 15, 'maroon'),
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: appColors.maroon,
    marginLeft: scaleWidth(6),
  },
  submitText: {
    ...typography(600, 15, 'white'),
    fontWeight: '600',
  },
});
