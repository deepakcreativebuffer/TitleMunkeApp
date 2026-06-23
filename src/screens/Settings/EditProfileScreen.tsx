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
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector, useAppDispatch} from '../../store';
import {userProfileSelector, setUser} from '../../slices';
import {updateProfileDetails} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icUpload = require('../../assets/images/ic-upload.png');

const formatUSPhone = (raw: string): string => {
  const d = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
  if (d.length <= 3) {
    return d;
  }
  if (d.length <= 6) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  }
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export const EditProfileScreen = ({
  navigation,
}: AppScreenProps<'EditProfile'>) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(userProfileSelector);

  const email = profile?.email ?? '';
  const initial = (profile?.name || email || 'A').charAt(0).toUpperCase();

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(
    formatUSPhone(String(profile?.phoneNumber ?? '')),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onUpdate = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const phoneNumber = phone.replace(/\D/g, '');
      await updateProfileDetails({name: name.trim(), phoneNumber, email});
      // Reflect the change locally so the app updates immediately.
      dispatch(setUser({...(profile ?? {}), name: name.trim(), phoneNumber}));
      navigation.goBack();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          'Could not update profile. Please try again.',
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
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <TouchableOpacity
              style={styles.uploadBtn}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert(
                  'Upload Image',
                  'Photo upload will be available soon.',
                )
              }>
              <Image source={icUpload} style={styles.uploadIcon} />
              <Text style={styles.uploadText}>Upload Image</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={appColors.gray}
              editable={!saving}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={t => setPhone(formatUSPhone(t))}
              placeholder="(454) 466-6565"
              placeholderTextColor={appColors.gray}
              keyboardType="phone-pad"
              editable={!saving}
            />

            <Text style={styles.label}>Email id</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText} numberOfLines={1}>
                {email || '—'}
              </Text>
            </View>
            <Text style={styles.hint}>Email can’t be changed.</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={saving}
              style={[styles.updateBtn, saving && styles.updateBtnDisabled]}
              onPress={onUpdate}>
              {saving ? (
                <ActivityIndicator color={appColors.white} />
              ) : (
                <Text style={styles.updateText}>Update</Text>
              )}
            </TouchableOpacity>
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
  headerTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
  },

  avatarWrap: {
    alignItems: 'center',
    marginBottom: scaleWidth(22),
  },
  avatar: {
    width: scaleWidth(96),
    height: scaleWidth(96),
    borderRadius: scaleWidth(96),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography(700, 38, 'white'),
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0EC',
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleWidth(11),
    marginTop: scaleWidth(14),
  },
  uploadIcon: {
    width: scaleWidth(17),
    height: scaleWidth(17),
    tintColor: appColors.coffeeDark,
    marginRight: scaleWidth(8),
  },
  uploadText: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
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
    justifyContent: 'center',
    ...typography('regular', 15, 'coffeeDark'),
  },
  inputDisabled: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  disabledText: {
    ...typography('regular', 15, 'gray'),
  },
  hint: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(6),
  },
  error: {
    ...typography('regular', 13, 'error'),
    marginTop: scaleWidth(12),
  },
  updateBtn: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(24),
  },
  updateBtnDisabled: {opacity: 0.7},
  updateText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
  },
});
