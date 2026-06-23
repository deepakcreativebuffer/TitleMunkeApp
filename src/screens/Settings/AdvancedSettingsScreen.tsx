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
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {userProfileSelector, userRoleSelector} from '../../slices';
import {useFetch} from '../../hooks';
import {ConfirmModal} from '../../components/ConfirmModal';
import {
  getAgentDetails,
  getBrokerDetails,
  getBrokerAndOrganizationSelectListing,
  addRequestToJoinUser,
  cancelRequestToJoinUser,
} from '../../api/userAdmin.api';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icCheckPlain = require('../../assets/images/ic-check-plain.png');

const unwrap = (raw: any) => raw?.data ?? raw;
const listFrom = (res: any): any[] =>
  Array.isArray(res) ? res : res?.data ?? res?.items ?? res?.data?.items ?? [];

export const AdvancedSettingsScreen = ({
  navigation,
}: AppScreenProps<'AdvancedSettings'>) => {
  const insets = useSafeAreaInsets();
  const profile = useAppSelector(userProfileSelector);
  const role = useAppSelector(userRoleSelector);
  const isAgent = role === 'agent';
  const userId = profile?.sub ?? '';

  // The entity this user connects to.
  const entityType = isAgent ? 'broker' : 'organisation';
  const entityLabel = isAgent ? 'Broker' : 'Organisation';
  const connectionTitle = isAgent ? 'Broker Connection' : 'Organization Connection';
  const roleLabel = isAgent ? 'Agent' : 'Broker';

  // Current connection details.
  const detailFetcher = useCallback(
    () =>
      userId
        ? isAgent
          ? getAgentDetails(userId)
          : getBrokerDetails(userId)
        : Promise.resolve(null),
    [userId, isAgent],
  );
  const {data: rawDetail, loading, reload} = useFetch(detailFetcher, [
    userId,
    isAgent,
  ]);

  const conn = useMemo(() => {
    const d = unwrap(rawDetail) ?? {};
    const rel = d.relationship ?? {};
    if (isAgent) {
      return {
        connected: !!(d.isUnderBroker || rel.brokerId),
        name: rel.brokerFirstName ?? '-',
        targetId: rel.brokerId ?? '',
      };
    }
    return {
      connected: !!(d.isUnderOrganisation || rel.organisationId),
      name: rel.organisationFirstName ?? '-',
      targetId: rel.organisationId ?? '',
    };
  }, [rawDetail, isAgent]);

  // ── Leave flow ─────────────────────────────────────────────────────────────
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const onLeave = useCallback(async () => {
    setLeaving(true);
    try {
      await cancelRequestToJoinUser({
        userType: entityType,
        userId: conn.targetId,
      });
      setConfirmLeave(false);
      reload();
    } catch {
      // keep modal open
    } finally {
      setLeaving(false);
    }
  }, [entityType, conn.targetId, reload]);

  // ── Join flow ──────────────────────────────────────────────────────────────
  const [joinOpen, setJoinOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [joining, setJoining] = useState(false);

  const wantedType = isAgent ? 'broker' : 'organisation';
  const listFetcher = useCallback(
    () => getBrokerAndOrganizationSelectListing(),
    [],
  );
  const {data: rawList, loading: listLoading} = useFetch(listFetcher, []);
  const options = useMemo(() => {
    return listFrom(rawList)
      .filter(it => {
        const t = String(it.__typename ?? it.userType ?? '').toLowerCase();
        return !t || t === wantedType;
      })
      .map(it => ({
        id: it.id ?? it.userId,
        name: it.name ?? '—',
        email: it.email ?? '',
        count:
          it.activeAgentCount ??
          it.totalActiveCount ??
          it.agentCount ??
          it.activeBrokerCount ??
          0,
      }));
  }, [rawList, wantedType]);
  const selected = useMemo(
    () => options.find(o => o.id === selectedId),
    [options, selectedId],
  );
  const countLabel = isAgent ? 'Active Agents' : 'Active Brokers';

  const onSend = useCallback(async () => {
    if (!selectedId) {
      return;
    }
    setJoining(true);
    try {
      await addRequestToJoinUser({
        userType: entityType,
        userId: selectedId,
        ...(message.trim() ? {message: message.trim()} : {}),
      });
      setJoinOpen(false);
      setSelectedId('');
      setMessage('');
      reload();
    } catch {
      // keep modal open
    } finally {
      setJoining(false);
    }
  }, [selectedId, message, entityType, reload]);

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
          <Text style={styles.headerTitle}>Advanced Settings</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>

        {/* Connection card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{connectionTitle}</Text>
          {loading && !rawDetail ? (
            <ActivityIndicator
              color={appColors.maroon}
              style={{marginVertical: scaleWidth(16)}}
            />
          ) : conn.connected ? (
            <>
              <Text style={styles.connLine}>
                Connected to: <Text style={styles.connBold}>{conn.name}</Text>
              </Text>
              <Text style={styles.connLine}>
                Role : <Text style={styles.connBold}>{roleLabel}</Text>
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.leaveBtn}
                onPress={() => setConfirmLeave(true)}>
                <Text style={styles.leaveText}>Leave {entityLabel}</Text>
                <Text style={styles.leaveArrow}>→</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.connLine}>
                You are not connected to {isAgent ? 'a broker' : 'an organisation'}.
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.joinBtn}
                onPress={() => setJoinOpen(true)}>
                <Text style={styles.leaveText}>Join {entityLabel}</Text>
                <Text style={styles.leaveArrow}>→</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Leave confirmation */}
      <ConfirmModal
        visible={confirmLeave}
        title="Confirm Cancellation"
        message={`If you continue, your ${roleLabel.toLowerCase()} account will be unlinked from ${conn.name}. Any ${entityLabel.toLowerCase()}-specific permissions, pricing, or access may be revoked.`}
        confirmLabel={`Yes, Leave`}
        cancelLabel={`Keep ${entityLabel}`}
        danger
        loading={leaving}
        onConfirm={onLeave}
        onCancel={() => (leaving ? null : setConfirmLeave(false))}
      />

      {/* Join modal */}
      <Modal
        visible={joinOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Join {entityLabel}</Text>
              <TouchableOpacity
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                onPress={() => setJoinOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            {listLoading ? (
              <ActivityIndicator
                color={appColors.maroon}
                style={{marginVertical: scaleWidth(20)}}
              />
            ) : options.length === 0 ? (
              <Text style={styles.optionEmpty}>
                No {entityLabel.toLowerCase()}s available.
              </Text>
            ) : (
              <>
                {/* Name dropdown */}
                <Text style={styles.label}>Name</Text>
                <View style={styles.nameWrap}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.nameChip}
                    onPress={() => setNameOpen(o => !o)}>
                    <Text
                      style={[
                        styles.nameChipText,
                        !selected && {color: appColors.gray},
                      ]}
                      numberOfLines={1}>
                      {selected?.name ?? 'Select'}
                    </Text>
                    <Image
                      source={icChevron}
                      style={[
                        styles.nameChevron,
                        nameOpen && {transform: [{rotate: '-90deg'}]},
                      ]}
                    />
                  </TouchableOpacity>
                  {nameOpen ? (
                    <View style={styles.nameDropdown}>
                      <ScrollView
                        style={{maxHeight: scaleWidth(180)}}
                        keyboardShouldPersistTaps="handled">
                        {options.map(o => {
                          const active = o.id === selectedId;
                          return (
                            <TouchableOpacity
                              key={o.id}
                              activeOpacity={0.7}
                              style={styles.optionRow}
                              onPress={() => {
                                setSelectedId(o.id);
                                setNameOpen(false);
                              }}>
                              <Text
                                style={[
                                  styles.optionText,
                                  active && styles.optionActive,
                                ]}
                                numberOfLines={1}>
                                {o.name}
                              </Text>
                              {active ? (
                                <Image
                                  source={icCheckPlain}
                                  style={styles.optionCheck}
                                />
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {/* Selected entity card + message */}
                {selected ? (
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailAvatar}>
                        <Text style={styles.detailAvatarText}>
                          {selected.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.detailInfo}>
                        <Text style={styles.detailName} numberOfLines={1}>
                          {selected.name}
                        </Text>
                        {selected.email ? (
                          <Text style={styles.detailEmail} numberOfLines={1}>
                            {selected.email}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.detailCount}>
                        {selected.count} {countLabel}
                      </Text>
                    </View>

                    <Text style={styles.detailMsgLabel}>
                      Add a message (Optional)
                    </Text>
                    <TextInput
                      style={styles.detailMsgInput}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Add a note"
                      placeholderTextColor={appColors.gray}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                ) : null}

                {/* Warning */}
                <View style={styles.warnBox}>
                  <Text style={styles.warnText}>
                    ⚠️ Your request will be reviewed by the {entityLabel.toLowerCase()}.
                    You will be notified once approved.
                  </Text>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.modalBtn, styles.modalCancel]}
                disabled={joining}
                onPress={() => setJoinOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel Request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.modalBtn,
                  styles.modalSend,
                  (!selectedId || joining) && {opacity: 0.5},
                ]}
                disabled={!selectedId || joining}
                onPress={onSend}>
                {joining ? (
                  <ActivityIndicator color={appColors.maroon} />
                ) : (
                  <Text style={styles.modalSendText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: scaleWidth(18),
    padding: scaleWidth(20),
    ...shadow,
  },
  cardTitle: {
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(14),
  },
  connLine: {
    ...typography('regular', 15, 'gray'),
    marginBottom: scaleWidth(10),
  },
  connBold: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleWidth(12),
    marginTop: scaleWidth(8),
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(18),
    paddingVertical: scaleWidth(12),
    marginTop: scaleWidth(10),
  },
  leaveText: {...typography(600, 15, 'white'), fontWeight: '600'},
  leaveArrow: {
    color: appColors.white,
    fontSize: scaleWidth(16),
    marginLeft: scaleWidth(10),
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,8,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(28),
  },
  modalCard: {
    width: '100%',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(20),
    padding: scaleWidth(22),
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  modalClose: {fontSize: scaleWidth(18), color: appColors.coffeeDark},
  modalDivider: {
    height: 1,
    backgroundColor: '#F1EDEA',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(6),
  },
  label: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(8),
  },
  nameWrap: {position: 'relative', zIndex: 40},
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: scaleWidth(50),
    borderWidth: 1.4,
    borderColor: appColors.maroon,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
  },
  nameChipText: {
    flex: 1,
    ...typography('regular', 15, 'coffeeDark'),
    marginRight: scaleWidth(8),
  },
  nameChevron: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    tintColor: appColors.gray,
    transform: [{rotate: '90deg'}],
  },
  nameDropdown: {
    position: 'absolute',
    top: scaleWidth(54),
    left: 0,
    right: 0,
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: appColors.inputBorder,
    paddingHorizontal: scaleWidth(12),
    zIndex: 50,
    elevation: 12,
    shadowColor: '#3d2014',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleWidth(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1EDEA',
  },
  optionText: {flex: 1, ...typography(500, 14, 'coffeeDark'), fontWeight: '500'},
  optionActive: {...typography(600, 14, 'maroon'), fontWeight: '600'},
  optionCheck: {
    width: scaleWidth(16),
    height: scaleWidth(16),
    tintColor: appColors.maroon,
  },
  optionEmpty: {
    ...typography('regular', 13, 'gray'),
    textAlign: 'center',
    paddingVertical: scaleWidth(20),
  },

  detailCard: {
    backgroundColor: appColors.background,
    borderRadius: scaleWidth(14),
    padding: scaleWidth(14),
    marginTop: scaleWidth(16),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    padding: scaleWidth(12),
  },
  detailAvatar: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(40),
    backgroundColor: 'rgba(94,23,23,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  detailAvatarText: {...typography(700, 16, 'white'), fontWeight: '700'},
  detailInfo: {flex: 1, paddingRight: scaleWidth(8)},
  detailName: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  detailEmail: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(2)},
  detailCount: {...typography('regular', 12, 'gray')},
  detailMsgLabel: {
    ...typography(600, 14, 'coffeeDark'),
    fontWeight: '600',
    marginTop: scaleWidth(14),
    marginBottom: scaleWidth(8),
  },
  detailMsgInput: {
    minHeight: scaleWidth(56),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleWidth(10),
    ...typography('regular', 14, 'coffeeDark'),
  },
  warnBox: {
    backgroundColor: appColors.background,
    borderRadius: scaleWidth(12),
    padding: scaleWidth(14),
    marginTop: scaleWidth(16),
  },
  warnText: {
    ...typography('regular', 13, 'coffeeLight'),
    lineHeight: scaleWidth(19),
  },

  modalActions: {flexDirection: 'row', marginTop: scaleWidth(18)},
  modalBtn: {
    flex: 1,
    height: scaleWidth(50),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {backgroundColor: appColors.maroon, marginRight: scaleWidth(6)},
  modalCancelText: {...typography(600, 15, 'white'), fontWeight: '600'},
  modalSend: {
    backgroundColor: 'rgba(193,82,82,0.08)',
    borderWidth: 1.4,
    borderColor: 'rgba(193,82,82,0.5)',
    marginLeft: scaleWidth(6),
  },
  modalSendText: {...typography(600, 15, 'maroon'), fontWeight: '600'},
});
