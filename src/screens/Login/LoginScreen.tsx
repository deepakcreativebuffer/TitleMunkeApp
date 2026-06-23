import React, {useState, useEffect} from 'react';
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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {loginSchema, LoginSchemaType} from '../../schemas';
import {useAppDispatch, useAppSelector} from '../../store';
import {loginThunk} from '../../thunks';
import {
  authStatusSelector,
  authErrorSelector,
  clearAuthError,
} from '../../slices';

const gridBg = require('../../assets/images/grid-bg.png');
const logo = require('../../assets/images/logo.png');
const icMail = require('../../assets/images/ic-mail.png');
const icLock = require('../../assets/images/ic-lock.png');
const icEye = require('../../assets/images/ic-eye.png');
const icCheck = require('../../assets/images/ic-check.png');
const icChevron = require('../../assets/images/ic-chevron.png');

const FEATURES = [
  'Verified property network',
  'Flexible access plans',
  'Usage-based search',
];

export const LoginScreen = ({navigation}: AppScreenProps<'LoginScreen'>) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const status = useAppSelector(authStatusSelector);
  const apiError = useAppSelector(authErrorSelector);
  const loading = status === 'loading';
  const [secure, setSecure] = useState(true);

  const {control, handleSubmit, formState} = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {email: '', password: ''},
    mode: 'onTouched',
  });
  const {errors} = formState;

  // Clear any stale API error when leaving the screen.
  useEffect(() => () => void dispatch(clearAuthError()), [dispatch]);

  const onSubmit = async (values: LoginSchemaType) => {
    try {
      await dispatch(loginThunk(values)).unwrap();
      navigation.reset({index: 0, routes: [{name: 'TabNavigator'}]});
    } catch {
      // Rejection message is surfaced via the `apiError` selector.
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
            {paddingTop: insets.top + scaleWidth(24)},
            {paddingBottom: insets.bottom + scaleWidth(20)},
          ]}>
          {/* Brand */}
          <View style={styles.brand}>
            <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.welcome}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Please enter your details to log in
            </Text>

            {/* Email */}
            <Text style={styles.label}>EMAIL</Text>
            <Controller
              control={control}
              name="email"
              render={({field: {value, onChange, onBlur}}) => (
                <View
                  style={[styles.input, errors.email && styles.inputError]}>
                  <Image source={icMail} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    value={value}
                    onChangeText={t => {
                      if (apiError) {
                        dispatch(clearAuthError());
                      }
                      onChange(t);
                    }}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    placeholder="you@example.com"
                    placeholderTextColor={appColors.gray}
                  />
                </View>
              )}
            />
            {errors.email ? (
              <Text style={styles.fieldError}>{errors.email.message}</Text>
            ) : null}

            {/* Password */}
            <Text style={[styles.label, styles.labelSpaced]}>PASSWORD</Text>
            <Controller
              control={control}
              name="password"
              render={({field: {value, onChange, onBlur}}) => (
                <View
                  style={[styles.input, errors.password && styles.inputError]}>
                  <Image source={icLock} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputText}
                    value={value}
                    onChangeText={t => {
                      if (apiError) {
                        dispatch(clearAuthError());
                      }
                      onChange(t);
                    }}
                    onBlur={onBlur}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    placeholder="Enter your password"
                    placeholderTextColor={appColors.gray}
                  />
                  <TouchableOpacity
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    onPress={() => setSecure(s => !s)}>
                    <Image source={icEye} style={styles.eyeIcon} />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.forgotWrap}
              onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            {apiError ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{apiError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}>
              {loading ? (
                <ActivityIndicator color={appColors.white} />
              ) : (
                <>
                  <Text style={styles.loginText}>Log In</Text>
                  <Image source={icChevron} style={styles.loginChevron} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerMuted}>Don't have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Register Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature pills */}
          <View style={styles.features}>
            {FEATURES.map(f => (
              <View key={f} style={styles.pill}>
                <Image source={icCheck} style={styles.pillCheck} />
                <Text style={styles.pillText}>{f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const cardShadow = {
  shadowColor: '#3d2014',
  shadowOffset: {width: 0, height: 10},
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 4,
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  bg: {flex: 1, backgroundColor: appColors.background},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scaleWidth(22),
  },
  brand: {
    alignItems: 'center',
    marginBottom: scaleWidth(10),
  },
  brandLogo: {
    width: scaleWidth(128),
    height: scaleWidth(128),
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(26),
    padding: scaleWidth(24),
    ...cardShadow,
  },
  welcome: {
    ...typography(700, 24, 'coffeeDark'),
    fontWeight: '700',
  },
  subtitle: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(6),
    marginBottom: scaleWidth(16),
  },
  label: {
    ...typography(600, 11, 'coffeeLight'),
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: scaleWidth(8),
  },
  labelSpaced: {
    marginTop: scaleWidth(14),
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  inputError: {
    borderColor: appColors.error,
  },
  inputIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeLight,
    marginRight: scaleWidth(10),
  },
  inputText: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    padding: 0,
  },
  eyeIcon: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.gray,
  },
  fieldError: {
    ...typography('regular', 12, 'error'),
    marginTop: scaleWidth(6),
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(16),
  },
  forgot: {
    ...typography(600, 13, 'maroonLink'),
    fontWeight: '600',
  },
  banner: {
    backgroundColor: 'rgba(220, 53, 69, 0.10)',
    borderRadius: scaleWidth(10),
    paddingVertical: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    marginBottom: scaleWidth(14),
  },
  bannerText: {
    ...typography(500, 13, 'error'),
    fontWeight: '500',
    textAlign: 'center',
  },
  loginBtn: {
    height: scaleWidth(54),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginText: {
    ...typography(600, 16, 'white'),
    fontWeight: '600',
  },
  loginChevron: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.white,
    marginLeft: scaleWidth(8),
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: scaleWidth(20),
  },
  registerMuted: {
    ...typography('regular', 13, 'gray'),
  },
  registerLink: {
    ...typography(700, 13, 'maroonLink'),
    fontWeight: '700',
  },
  features: {
    marginTop: scaleWidth(14),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingVertical: scaleWidth(11),
    paddingHorizontal: scaleWidth(16),
    marginBottom: scaleWidth(8),
    ...cardShadow,
    shadowOpacity: 0.06,
  },
  pillCheck: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    tintColor: appColors.maroonLink,
    marginRight: scaleWidth(12),
  },
  pillText: {
    ...typography(500, 14, 'coffeeDark'),
    fontWeight: '500',
  },
});
