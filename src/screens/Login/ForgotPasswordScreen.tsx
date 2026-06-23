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
import {forgotPassword} from '../../api/userAdmin.api';
import {cognitoConfirmForgotPassword} from '../../api/cognito';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icEye = require('../../assets/images/ic-eye.png');

const Password = ({
  label,
  value,
  placeholder,
  onChange,
  editable,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (t: string) => void;
  editable: boolean;
}) => {
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

export const ForgotPasswordScreen = ({
  navigation,
}: AppScreenProps<'ForgotPassword'>) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSendCode = async () => {
    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) {
      setError('Please enter a valid email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep('reset');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          'Could not send the reset code. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!code.trim()) {
      setError('Please enter the code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await cognitoConfirmForgotPassword(
        email.trim().toLowerCase(),
        code.trim(),
        password,
      );
      Alert.alert('Success', 'Your password has been reset. Please sign in.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.__type ||
        'Could not reset the password. Check your code and try again.';
      setError(String(msg).replace(/Exception$/, ''));
    } finally {
      setLoading(false);
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
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() =>
                step === 'reset' ? setStep('email') : navigation.goBack()
              }>
              <Image source={icChevron} style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forgot Password</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

          <View style={styles.card}>
            {step === 'email' ? (
              <>
                <Text style={styles.intro}>
                  Enter your account email and we’ll send you a code to reset
                  your password.
                </Text>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@email.com"
                    placeholderTextColor={appColors.gray}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={loading}
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={onSendCode}>
                  {loading ? (
                    <ActivityIndicator color={appColors.white} />
                  ) : (
                    <Text style={styles.btnText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.intro}>
                  We sent a code to{' '}
                  <Text style={styles.introBold}>{email}</Text>. Enter it below
                  with your new password.
                </Text>

                <Text style={styles.label}>Verification Code</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    placeholderTextColor={appColors.gray}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <Password
                  label="New Password"
                  value={password}
                  placeholder="New password"
                  onChange={setPassword}
                  editable={!loading}
                />
                <Password
                  label="Confirm New Password"
                  value={confirm}
                  placeholder="Confirm new password"
                  onChange={setConfirm}
                  editable={!loading}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={loading}
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={onReset}>
                  {loading ? (
                    <ActivityIndicator color={appColors.white} />
                  ) : (
                    <Text style={styles.btnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.resend}
                  disabled={loading}
                  onPress={onSendCode}>
                  <Text style={styles.resendText}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}
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
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(20),
    ...shadow,
  },
  intro: {
    ...typography('regular', 14, 'gray'),
    lineHeight: scaleWidth(20),
    marginBottom: scaleWidth(6),
  },
  introBold: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
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
  input: {flex: 1, ...typography('regular', 15, 'coffeeDark'), padding: 0},
  eye: {width: scaleWidth(20), height: scaleWidth(20), tintColor: appColors.gray},
  error: {...typography('regular', 13, 'error'), marginTop: scaleWidth(14)},
  btn: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(24),
  },
  btnDisabled: {opacity: 0.7},
  btnText: {...typography(600, 16, 'white'), fontWeight: '600'},
  resend: {alignItems: 'center', marginTop: scaleWidth(16)},
  resendText: {...typography(600, 14, 'maroon'), fontWeight: '600'},
});
