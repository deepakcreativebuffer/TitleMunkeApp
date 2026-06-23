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
import {changePassword} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icEye = require('../../assets/images/ic-eye.png');

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (t: string) => void;
  editable: boolean;
};

const PasswordField = ({label, value, placeholder, onChange, editable}: FieldProps) => {
  const [secure, setSecure] = useState(true);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={appColors.gray}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
        <TouchableOpacity
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          onPress={() => setSecure(s => !s)}>
          <Image source={icEye} style={styles.eye} />
        </TouchableOpacity>
      </View>
    </>
  );
};

export const ChangePasswordScreen = ({
  navigation,
}: AppScreenProps<'ChangePassword'>) => {
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onUpdate = async () => {
    if (!current.trim() || !next.trim() || !confirm.trim()) {
      setError('Please fill all the fields.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirm password do not match.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await changePassword({currentPassword: current, newPassword: next});
      Alert.alert('Success', 'Your password has been updated.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          'Could not update password. Please try again.',
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
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

          {/* Form */}
          <View style={styles.card}>
            <PasswordField
              label="Current Password"
              value={current}
              onChange={setCurrent}
              placeholder="Current password"
              editable={!saving}
            />
            <PasswordField
              label="New Password"
              value={next}
              onChange={setNext}
              placeholder="New password"
              editable={!saving}
            />
            <PasswordField
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Confirm new password"
              editable={!saving}
            />

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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  input: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    padding: 0,
  },
  eye: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.gray,
  },
  error: {
    ...typography('regular', 13, 'error'),
    marginTop: scaleWidth(14),
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
