import React, {useMemo, useState} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {appColors, typography, scaleWidth} from '../../global';
import {AppScreenProps} from '../../types';
import {useAppSelector} from '../../store';
import {messagingUsersSelector} from '../../slices';
import {Avatar} from '../../components/Avatar';

const gridBg = require('../../assets/images/grid-bg.png');
const icChevron = require('../../assets/images/ic-chevron.png');
const icSearch = require('../../assets/images/ic-search.png');

export const NewChatScreen = ({navigation}: AppScreenProps<'NewChat'>) => {
  const insets = useSafeAreaInsets();
  const users = useAppSelector(messagingUsersSelector);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return users;
    }
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, q]);

  const start = (participantId: string) =>
    // Replace so back from the chat returns to the conversation list.
    navigation.replace('Chat', {participantId});

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
          <Text style={styles.headerTitle}>New Chat</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBox}>
          <Image source={icSearch} style={styles.searchIcon} />
          <TextInput
            style={styles.searchText}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people…"
            placeholderTextColor={appColors.gray}
            autoCapitalize="none"
            autoFocus
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: scaleWidth(20),
            paddingBottom: insets.bottom + scaleWidth(40),
          }}>
          {filtered.map(u => (
            <TouchableOpacity
              key={u.id}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => start(u.id)}>
              <Avatar
                name={u.name}
                id={u.id}
                online={u.status === 'online'}
              />
              <View style={styles.mid}>
                <Text style={styles.name} numberOfLines={1}>
                  {u.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  @{u.username} · {u.email}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 ? (
            <Text style={styles.noResults}>No people match “{query}”.</Text>
          ) : null}
        </ScrollView>
      </View>
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
  noResults: {
    ...typography(500, 13, 'gray'),
    fontWeight: '500',
    textAlign: 'center',
    marginTop: scaleWidth(40),
  },
});
