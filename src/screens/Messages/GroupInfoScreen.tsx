import React, {useEffect, useMemo, useState} from 'react';
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
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps, ChatContact} from '../../types';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  conversationByIdSelector,
  myUserIdSelector,
  userProfileSelector,
  userRoleSelector,
  applyGroupUpdated,
} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {userImageUrl} from '../../utils/chat';
import {seedCachedImageUri} from '../../utils/imageCache';
import {fetchChatContacts} from '../../api/contacts.api';
import {
  wsAddGroupMember,
  wsRemoveGroupMember,
  wsUpdateGroup,
} from '../../services/messaging.ws';
import {
  pickImageFromLibrary,
  uploadAttachments,
  PICKER_UNAVAILABLE,
  PERMISSION_DENIED,
} from '../../services/attachmentUpload';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icEdit = require('../../assets/images/ic-edit.png');

export const GroupInfoScreen = ({
  navigation,
  route,
}: AppScreenProps<'GroupInfo'>) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {conversationId, groupId, title} = route.params;
  const role = useAppSelector(userRoleSelector);
  const profile = useAppSelector(userProfileSelector);
  const myUserId = useAppSelector(myUserIdSelector);
  const conv = useAppSelector(conversationByIdSelector(conversationId));

  const groupName = conv?.group?.name ?? title ?? 'Group';
  const groupImage = conv?.group?.image_url ?? undefined;

  // Derive the member list from `participants` (always returned by
  // getConversations), overlaying ADMIN/MEMBER roles from group.members when we
  // have them, else marking the group creator as ADMIN. This keeps the count in
  // sync with the chat header (which also uses participants).
  const members = useMemo(() => {
    const gm = conv?.group?.members ?? [];
    const createdBy = conv?.group?.created_by;
    return (conv?.participants ?? []).map(p => {
      const match = gm.find(m => m.user_id === p.user_id);
      const memberRole =
        match?.role ?? (createdBy === p.user_id ? 'ADMIN' : 'MEMBER');
      return {user_id: p.user_id, user: p.user, role: memberRole};
    });
  }, [conv]);
  const amAdmin = members.find(m => m.user_id === myUserId)?.role === 'ADMIN';

  const [addOpen, setAddOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Rename + change-photo (admins only).
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(groupName);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Local preview of a just-picked photo (until the backend returns image_url).
  const [localPhoto, setLocalPhoto] = useState<string | undefined>();

  const notifyError = (e: unknown, fallback: string) => {
    if (e instanceof Error && e.message === PERMISSION_DENIED) {
      Alert.alert('Permission needed', 'Enable photo access in Settings.');
    } else if (e instanceof Error && e.message === PICKER_UNAVAILABLE) {
      Alert.alert('Photos', 'This needs an app rebuild.');
    } else {
      Alert.alert('Group', fallback);
    }
  };

  const saveName = () => {
    const next = nameInput.trim();
    setEditingName(false);
    if (!next || next === groupName) {
      return;
    }
    wsUpdateGroup({groupId, name: next});
    dispatch(applyGroupUpdated({groupId, name: next})); // optimistic
  };

  const changePhoto = async () => {
    try {
      const files = await pickImageFromLibrary();
      const file = files[0];
      if (!file) {
        return;
      }
      setLocalPhoto(file.uri); // instant preview
      setUploadingPhoto(true);
      const [uploaded] = await uploadAttachments([file]);
      // Cache the local file under the S3 key so the group photo shows
      // instantly in the conversation list (which keys avatars by image_key)
      // without waiting for a signed download URL.
      void seedCachedImageUri(uploaded.fileKey, file.uri);
      wsUpdateGroup({groupId, imageKey: uploaded.fileKey});
      dispatch(applyGroupUpdated({groupId, image_key: uploaded.fileKey}));
    } catch (e) {
      setLocalPhoto(undefined);
      notifyError(e, 'Could not update the group photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!addOpen || contacts.length) {
      return;
    }
    setLoadingContacts(true);
    fetchChatContacts(role, profile)
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [addOpen, role, profile, contacts.length]);

  const memberIds = useMemo(
    () => new Set(members.map(m => m.user_id)),
    [members],
  );
  const addable = contacts.filter(c => !memberIds.has(c.id));

  const addMember = (c: ChatContact) => {
    wsAddGroupMember(groupId, [c.id]);
    setAddOpen(false);
  };

  const removeMember = (userId: number, name: string) => {
    Alert.alert('Remove member', `Remove ${name} from the group?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => wsRemoveGroupMember(groupId, [userId]),
      },
    ]);
  };

  const leaveGroup = () => {
    Alert.alert('Leave group', 'Are you sure you want to leave?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (myUserId != null) {
            wsRemoveGroupMember(groupId, [myUserId]);
          }
          navigation.pop(2);
        },
      },
    ]);
  };

  return (
    <ImageBackground source={gridBg} resizeMode="cover" style={styles.bg}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={appColors.background}
        translucent={false}
      />
      <View style={{paddingTop: insets.top + scaleWidth(10), flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}>
            <Image source={icChevron} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Info</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(40),
          }}>
          <View style={styles.groupHead}>
            <TouchableOpacity
              activeOpacity={amAdmin ? 0.8 : 1}
              disabled={!amAdmin || uploadingPhoto}
              onPress={changePhoto}>
              {localPhoto ? (
                <Image source={{uri: localPhoto}} style={styles.groupPhoto} />
              ) : (
                <Avatar
                  name={groupName}
                  id={`g${conversationId}`}
                  imageUrl={groupImage}
                  cacheKey={conv?.group?.image_key ?? undefined}
                  group
                  size={scaleWidth(88)}
                />
              )}
              {uploadingPhoto ? (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color={appColors.white} />
                </View>
              ) : amAdmin ? (
                <View style={styles.cameraBadge}>
                  {/* Filled white camera glyph — crisp at badge size. */}
                  <View style={styles.camGlyph}>
                    <View style={styles.camBump} />
                    <View style={styles.camBody}>
                      <View style={styles.camLens}>
                        <View style={styles.camLensDot} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>

            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Group name"
                  placeholderTextColor={appColors.gray}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={saveName} style={styles.nameSave}>
                  <Text style={styles.nameSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={amAdmin ? 0.7 : 1}
                disabled={!amAdmin}
                onPress={() => {
                  setNameInput(groupName);
                  setEditingName(true);
                }}
                style={styles.nameRow}>
                <Text style={styles.groupName}>{groupName}</Text>
                {amAdmin ? (
                  <Image source={icEdit} style={styles.editIcon} />
                ) : null}
              </TouchableOpacity>
            )}

            {conv?.group?.description ? (
              <Text style={styles.groupDesc}>{conv.group.description}</Text>
            ) : null}
            <Text style={styles.memberCount}>{members.length} members</Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>MEMBERS</Text>
            {amAdmin ? (
              <TouchableOpacity onPress={() => setAddOpen(true)}>
                <Text style={styles.addLink}>+ Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {members.map(m => (
            <View key={m.user_id} style={styles.memberCard}>
              <Avatar
                name={m.user?.name ?? 'User'}
                id={`u${m.user_id}`}
                imageUrl={userImageUrl(m.user)}
                cacheKey={m.user?.profile_image_key ?? undefined}
                size={scaleWidth(42)}
              />
              <View style={styles.memberMid}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user_id === myUserId ? 'You' : m.user?.name ?? 'User'}
                </Text>
                {m.user?.email ? (
                  <Text style={styles.memberEmail} numberOfLines={1}>
                    {m.user.email}
                  </Text>
                ) : null}
              </View>
              {m.role === 'ADMIN' ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              ) : null}
              {amAdmin && m.user_id !== myUserId ? (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    removeMember(m.user_id, m.user?.name ?? 'this member')
                  }>
                  <Text style={styles.removeX}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          <TouchableOpacity style={styles.leaveBtn} onPress={leaveGroup}>
            <Text style={styles.leaveText}>Leave Group</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Add member modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add member</Text>
            {loadingContacts ? (
              <ActivityIndicator
                color={appColors.maroon}
                style={{marginVertical: scaleWidth(20)}}
              />
            ) : addable.length === 0 ? (
              <Text style={styles.noResults}>No one left to add.</Text>
            ) : (
              <ScrollView style={{maxHeight: scaleWidth(360)}}>
                {addable.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.memberCard}
                    onPress={() => addMember(c)}>
                    <Avatar name={c.name} id={`u${c.id}`} size={scaleWidth(42)} />
                    <View style={styles.memberMid}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      {c.email ? (
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {c.email}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.addPlus}>＋</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(14),
  },
  iconBtn: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  backIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.coffeeDark,
    transform: [{scaleX: -1}],
  },
  headerTitle: {...typography(700, 18, 'coffeeDark'), fontWeight: '700'},
  headerSpacer: {width: scaleWidth(44), height: scaleWidth(44)},
  groupHead: {alignItems: 'center', marginBottom: scaleWidth(20)},
  groupPhoto: {
    width: scaleWidth(88),
    height: scaleWidth(88),
    borderRadius: scaleWidth(44),
    backgroundColor: appColors.inputBorder,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scaleWidth(44),
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -scaleWidth(2),
    bottom: -scaleWidth(2),
    width: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(16),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: appColors.background,
  },
  camGlyph: {
    width: scaleWidth(18),
    height: scaleWidth(15),
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  camBump: {
    position: 'absolute',
    top: 0,
    left: scaleWidth(3),
    width: scaleWidth(7),
    height: scaleWidth(4),
    borderTopLeftRadius: scaleWidth(2),
    borderTopRightRadius: scaleWidth(2),
    backgroundColor: appColors.white,
  },
  camBody: {
    width: scaleWidth(18),
    height: scaleWidth(12),
    borderRadius: scaleWidth(4),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLens: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(3.5),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLensDot: {
    width: scaleWidth(2.5),
    height: scaleWidth(2.5),
    borderRadius: scaleWidth(1.25),
    backgroundColor: appColors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(12),
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleWidth(12),
    width: '100%',
    paddingHorizontal: scaleWidth(10),
  },
  nameInput: {
    flex: 1,
    ...typography(700, 18, 'coffeeDark'),
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1.4,
    borderBottomColor: appColors.maroon,
    paddingVertical: scaleWidth(4),
  },
  nameSave: {marginLeft: scaleWidth(10)},
  nameSaveText: {...typography(700, 14, 'maroon'), fontWeight: '700'},
  editIcon: {
    width: scaleWidth(15),
    height: scaleWidth(15),
    marginLeft: scaleWidth(8),
    tintColor: appColors.maroon,
    resizeMode: 'contain',
  },
  groupName: {
    ...typography(700, 20, 'coffeeDark'),
    fontWeight: '700',
  },
  groupDesc: {
    ...typography('regular', 13, 'gray'),
    marginTop: scaleWidth(4),
    textAlign: 'center',
  },
  memberCount: {...typography('regular', 13, 'gray'), marginTop: scaleWidth(6)},
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleWidth(10),
  },
  sectionLabel: {
    ...typography(600, 11, 'gray'),
    letterSpacing: 1,
    fontWeight: '600',
  },
  addLink: {...typography(600, 13, 'maroon'), fontWeight: '600'},
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(14),
    padding: scaleWidth(10),
    marginBottom: scaleWidth(8),
    ...shadow,
    shadowOpacity: 0.05,
  },
  memberMid: {flex: 1, marginLeft: scaleWidth(10)},
  memberName: {...typography(600, 14, 'coffeeDark'), fontWeight: '600'},
  memberEmail: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(1)},
  adminBadge: {
    backgroundColor: 'rgba(94,23,23,0.1)',
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleWidth(3),
    marginRight: scaleWidth(6),
  },
  adminBadgeText: {...typography(600, 10, 'maroon'), fontWeight: '600'},
  removeBtn: {padding: scaleWidth(6)},
  removeX: {...typography(700, 14, 'gray')},
  leaveBtn: {
    marginTop: scaleWidth(20),
    height: scaleWidth(50),
    borderRadius: scaleWidth(12),
    borderWidth: 1.4,
    borderColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: {...typography(600, 15, 'error'), fontWeight: '600', color: '#c0392b'},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    padding: scaleWidth(16),
    paddingBottom: scaleWidth(30),
  },
  sheetTitle: {
    ...typography(700, 16, 'coffeeDark'),
    fontWeight: '700',
    marginBottom: scaleWidth(12),
  },
  addPlus: {...typography(700, 22, 'maroon')},
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: scaleWidth(20),
  },
});
