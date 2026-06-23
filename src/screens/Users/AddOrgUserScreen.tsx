import React, {useCallback, useMemo, useState} from 'react';
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
import {useFetch} from '../../hooks';
import {
  createUserByAdmin,
  updateOrgBrokerDetail,
  updateAgentDetail,
  updateOrganisationDetail,
  updateAdminFromAdmin,
  getOrgBrokersList,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icCheckPlain = require('../../assets/images/ic-check-plain.png');

const listFrom = (res: any): any[] =>
  Array.isArray(res) ? res : res?.items ?? res?.data?.items ?? res?.data ?? [];

export const AddOrgUserScreen = ({
  navigation,
  route,
}: AppScreenProps<'AddOrgUser'>) => {
  const insets = useSafeAreaInsets();
  const kind = route.params?.kind ?? 'broker';
  const user = route.params?.user;
  const isEdit = !!user;
  const isBroker = kind === 'broker';
  const isAgent = kind === 'agent';
  const isOrg = kind === 'organisation';
  const isAdmin = kind === 'admin';
  // Org & Admin use the same simple form (name + email only).
  const isSimple = isOrg || isAdmin;
  const label = isBroker
    ? 'Broker'
    : isOrg
      ? 'Organization'
      : isAdmin
        ? 'Admin'
        : 'Agent';
  const orgId = useAppSelector(userProfileSelector)?.sub;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [teamStrength, setTeamStrength] = useState(
    user?.teamStrength ? String(user.teamStrength) : '',
  );
  const [message, setMessage] = useState('');
  const [brokerId, setBrokerId] = useState(user?.brokerId ?? '');
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Broker picker (only when adding an agent).
  const showBrokerPicker = isAgent && !isEdit;
  const brokersFetcher = useCallback(
    () => (showBrokerPicker ? getOrgBrokersList({limit: 100}) : Promise.resolve(null)),
    [showBrokerPicker],
  );
  const {data: rawBrokers} = useFetch(brokersFetcher, [showBrokerPicker]);
  const brokers = useMemo(() => listFrom(rawBrokers), [rawBrokers]);
  const brokerName =
    brokers.find(b => (b.id ?? b.userId) === brokerId)?.name ?? 'Select';

  const title = `${isEdit ? 'Edit' : 'Add'} ${label}`;
  const cta = isEdit ? 'Update' : `Add ${label}`;

  const onSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email.');
      return;
    }
    if (isBroker && !teamStrength.trim()) {
      setError('Please enter team strength.');
      return;
    }
    if (showBrokerPicker && !brokerId) {
      setError('Please select a broker for this agent.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      if (isEdit && isBroker) {
        await updateOrgBrokerDetail({
          id: user!.id,
          name: name.trim(),
          email: email.trim(),
          teamStrength: teamStrength.trim(),
        });
      } else if (isEdit && isOrg) {
        await updateOrganisationDetail({
          id: user!.id,
          name: name.trim(),
          email: email.trim(),
        });
      } else if (isEdit && isAdmin) {
        await updateAdminFromAdmin({
          id: user!.id,
          name: name.trim(),
          email: email.trim(),
        });
      } else if (isEdit && isAgent) {
        await updateAgentDetail({
          id: user!.id,
          name: name.trim(),
          email: email.trim(),
          searchLimit: user?.searchLimit ?? '',
        });
      } else {
        await createUserByAdmin({
          name: name.trim(),
          email: email.trim(),
          userType: kind,
          organisationId: orgId,
          planType: 'EXPLORE_PLAN',
          ...(message.trim() ? {message: message.trim()} : {}),
          ...(isBroker ? {teamStrength: teamStrength.trim()} : {}),
          ...(isAgent ? {brokerId} : {}),
        });
      }
      navigation.goBack();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
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
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}>
              <Image source={icChevron} style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.backBtnPlaceholder} />
          </View>

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
              placeholder="john@emailaddress.com"
              placeholderTextColor={appColors.gray}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!saving && !isEdit}
            />
            {isEdit ? (
              <Text style={styles.hint}>Email can’t be changed.</Text>
            ) : null}

            {isBroker ? (
              <>
                <Text style={styles.label}>Team Strength</Text>
                <TextInput
                  style={styles.input}
                  value={teamStrength}
                  onChangeText={t => setTeamStrength(t.replace(/[^0-9]/g, ''))}
                  placeholder="10"
                  placeholderTextColor={appColors.gray}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </>
            ) : showBrokerPicker ? (
              <>
                <Text style={styles.label}>Select Broker</Text>
                <View style={styles.pickerWrap}>
                  <TouchableOpacity
                    style={styles.input}
                    activeOpacity={0.8}
                    onPress={() => setBrokerOpen(o => !o)}>
                    <Text
                      style={[
                        styles.pickerText,
                        !brokerId && {color: appColors.gray},
                      ]}
                      numberOfLines={1}>
                      {brokerName}
                    </Text>
                    <Image source={icChevron} style={styles.pickerChevron} />
                  </TouchableOpacity>
                  {brokerOpen ? (
                    <View style={styles.dropdown}>
                      {brokers.length === 0 ? (
                        <Text style={styles.dropEmpty}>No brokers</Text>
                      ) : (
                        brokers.map(b => {
                          const id = b.id ?? b.userId;
                          const active = id === brokerId;
                          return (
                            <TouchableOpacity
                              key={id}
                              style={styles.dropOption}
                              activeOpacity={0.7}
                              onPress={() => {
                                setBrokerId(id);
                                setBrokerOpen(false);
                              }}>
                              <Text
                                style={[
                                  styles.dropText,
                                  active && styles.dropTextActive,
                                ]}
                                numberOfLines={1}>
                                {b.name ?? b.email ?? id}
                              </Text>
                              {active ? (
                                <Image
                                  source={icCheckPlain}
                                  style={styles.dropCheck}
                                />
                              ) : null}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {!isSimple ? (
              <>
                <Text style={styles.label}>Message (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Add a note…"
                  placeholderTextColor={appColors.gray}
                  multiline
                  textAlignVertical="top"
                  editable={!saving}
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={saving}
              style={[styles.submitBtn, saving && styles.submitDisabled]}
              onPress={onSubmit}>
              {saving ? (
                <ActivityIndicator color={appColors.white} />
              ) : (
                <Text style={styles.submitText}>{cta}</Text>
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
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
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
    minHeight: scaleWidth(52),
    borderWidth: 1.4,
    borderColor: appColors.inputBorder,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    flexDirection: 'row',
    alignItems: 'center',
    ...typography('regular', 15, 'coffeeDark'),
  },
  inputDisabled: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    color: appColors.gray,
  },
  hint: {
    ...typography('regular', 12, 'gray'),
    marginTop: scaleWidth(6),
  },
  textarea: {
    minHeight: scaleWidth(96),
    paddingTop: scaleWidth(12),
    paddingBottom: scaleWidth(12),
    alignItems: 'flex-start',
  },
  pickerWrap: {position: 'relative', zIndex: 40},
  pickerText: {flex: 1, ...typography('regular', 15, 'coffeeDark')},
  pickerChevron: {
    width: scaleWidth(13),
    height: scaleWidth(13),
    tintColor: appColors.gray,
    transform: [{rotate: '90deg'}],
  },
  dropdown: {
    position: 'absolute',
    top: scaleWidth(56),
    left: 0,
    right: 0,
    maxHeight: scaleWidth(220),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingVertical: scaleWidth(4),
    zIndex: 50,
    ...shadow,
    elevation: 10,
  },
  dropOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleWidth(12),
  },
  dropText: {flex: 1, ...typography(500, 14, 'coffeeDark'), fontWeight: '500'},
  dropTextActive: {...typography(600, 14, 'maroon'), fontWeight: '600'},
  dropCheck: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
  },
  dropEmpty: {
    ...typography('regular', 13, 'gray'),
    padding: scaleWidth(14),
  },
  error: {...typography('regular', 13, 'error'), marginTop: scaleWidth(14)},
  submitBtn: {
    height: scaleWidth(52),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleWidth(24),
  },
  submitDisabled: {opacity: 0.7},
  submitText: {...typography(600, 16, 'white'), fontWeight: '600'},
});
