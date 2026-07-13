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
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps, ChatContact} from '../../types';
import {useAppSelector} from '../../store';
import {userProfileSelector, userRoleSelector} from '../../slices';
import {Avatar} from '../../components/Avatar';
import {fetchChatContacts, canCreateGroups} from '../../api/contacts.api';
import {wsCreateGroup} from '../../services/messaging.ws';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSearch = require('../../assets/images/ic-search.png');

export const NewGroupScreen = ({navigation}: AppScreenProps<'NewGroup'>) => {
  const insets = useSafeAreaInsets();
  const role = useAppSelector(userRoleSelector);
  const profile = useAppSelector(userProfileSelector);

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Record<number, ChatContact>>({});
  const [creating, setCreating] = useState(false);

  const allowed = canCreateGroups(role);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let alive = true;
    fetchChatContacts(role, profile)
      .then(list => alive && setContacts(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [role, profile, allowed]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) {
      return contacts;
    }
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, q]);

  const selectedList = Object.values(selected);
  const toggle = (c: ChatContact) =>
    setSelected(prev => {
      const next = {...prev};
      if (next[c.id]) {
        delete next[c.id];
      } else {
        next[c.id] = c;
      }
      return next;
    });

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Group name', 'Please enter a group name.');
      return;
    }
    if (selectedList.length === 0) {
      Alert.alert('Members', 'Select at least one member.');
      return;
    }
    try {
      setCreating(true);
      const group = await wsCreateGroup({
        name: name.trim(),
        memberUserIds: selectedList.map(c => c.id),
      });
      setCreating(false);
      navigation.replace('Chat', {
        conversationId: group.conversation_id,
        groupId: group.id,
        title: group.name,
        isGroup: true,
      });
    } catch {
      setCreating(false);
      Alert.alert('Create group', 'Could not create the group. Try again.');
    }
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
          <Text style={styles.headerTitle}>New Group</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!allowed ? (
          <Text style={styles.noResults}>
            Your role can't create groups.
          </Text>
        ) : (
          <>
            <View style={styles.nameBox}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor={appColors.gray}
              />
            </View>

            {selectedList.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}>
                {selectedList.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.chip}
                    onPress={() => toggle(c)}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.chipX}>✕</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.searchBox}>
              <Image source={icSearch} style={styles.searchIcon} />
              <TextInput
                style={styles.searchText}
                value={query}
                onChangeText={setQuery}
                placeholder="Search people…"
                placeholderTextColor={appColors.gray}
                autoCapitalize="none"
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: scaleWidth(20),
                paddingBottom: insets.bottom + scaleWidth(90),
                flexGrow: 1,
              }}>
              {loading ? (
                <ActivityIndicator
                  color={appColors.maroon}
                  style={{marginTop: scaleWidth(40)}}
                />
              ) : filtered.length === 0 ? (
                <Text style={styles.noResults}>No contacts available.</Text>
              ) : (
                filtered.map(c => {
                  const on = !!selected[c.id];
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.85}
                      style={styles.card}
                      onPress={() => toggle(c)}>
                      <Avatar name={c.name} id={`u${c.id}`} />
                      <View style={styles.mid}>
                        <Text style={styles.name} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>
                          {c.role ? `${c.role} · ` : ''}
                          {c.email ?? ''}
                        </Text>
                      </View>
                      <View style={[styles.check, on && styles.checkOn]}>
                        {on ? <Text style={styles.checkMark}>✓</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </>
        )}
      </View>

      {allowed ? (
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={creating || !name.trim() || selectedList.length === 0}
          style={[
            styles.createBtn,
            {bottom: insets.bottom + scaleWidth(16)},
            (creating || !name.trim() || selectedList.length === 0) &&
              styles.createBtnDisabled,
          ]}
          onPress={create}>
          {creating ? (
            <ActivityIndicator size="small" color={appColors.white} />
          ) : (
            <Text style={styles.createText}>
              Create Group{selectedList.length ? ` (${selectedList.length})` : ''}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
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
  nameBox: {
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    marginHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(12),
    height: scaleWidth(50),
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.05,
  },
  nameInput: {...typography(600, 15, 'coffeeDark'), padding: 0},
  chipsRow: {
    paddingHorizontal: scaleWidth(20),
    gap: scaleWidth(8),
    alignItems: 'center',
    paddingVertical: scaleWidth(2),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
    backgroundColor: appColors.maroon,
    borderRadius: scaleWidth(18),
    paddingHorizontal: scaleWidth(14),
    minHeight: scaleWidth(34),
    marginBottom: scaleWidth(10),
    maxWidth: scaleWidth(180),
  },
  chipText: {
    ...typography(600, 12, 'white'),
    flexShrink: 1,
    lineHeight: scaleWidth(18),
    includeFontPadding: false,
  },
  chipX: {
    ...typography(700, 12, 'white'),
    lineHeight: scaleWidth(18),
    includeFontPadding: false,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: scaleWidth(48),
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    marginHorizontal: scaleWidth(20),
    marginBottom: scaleWidth(14),
    ...shadow,
    shadowOpacity: 0.05,
  },
  searchIcon: {
    width: scaleWidth(18),
    height: scaleWidth(18),
    tintColor: appColors.gray,
    marginRight: scaleWidth(10),
  },
  searchText: {flex: 1, ...typography('regular', 14, 'coffeeDark'), padding: 0},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.white,
    borderRadius: scaleWidth(16),
    padding: scaleWidth(12),
    marginBottom: scaleWidth(10),
    ...shadow,
  },
  mid: {flex: 1, marginLeft: scaleWidth(12)},
  name: {...typography(700, 15, 'coffeeDark'), fontWeight: '700'},
  sub: {...typography('regular', 12, 'gray'), marginTop: scaleWidth(2)},
  check: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    borderRadius: scaleWidth(12),
    borderWidth: 1.8,
    borderColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {backgroundColor: appColors.maroon},
  checkMark: {color: appColors.white, fontSize: scaleWidth(13), fontWeight: '700'},
  createBtn: {
    position: 'absolute',
    left: scaleWidth(20),
    right: scaleWidth(20),
    height: scaleWidth(52),
    borderRadius: scaleWidth(14),
    backgroundColor: appColors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  createBtnDisabled: {opacity: 0.5},
  createText: {...typography(600, 16, 'white'), fontWeight: '600'},
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: scaleWidth(40),
  },
});
