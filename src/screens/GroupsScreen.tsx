import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Group } from '@samishan11/moto-contract';
import { EmptyState, Loading } from '../components/layout';
import { RoleBadge } from '../components/RoleBadge';
import { useNavigation } from '../navigation/Navigator';
import { useGroupsInfinite } from '../api/queries';
import { errorMessage } from '../api/errorMessage';

/** How long typing must pause before the search term hits the server. */
const SEARCH_DEBOUNCE_MS = 350;

/** Deterministic 2-colour gradient per group so avatars are stable across renders. */
const AVATAR_GRADIENTS: [string, string][] = [
  ['#FF5A1F', '#FF8A3D'],
  ['#2E8BFF', '#1E6FD0'],
  ['#30D158', '#22A045'],
  ['#BF5AF2', '#8E3FD0'],
  ['#FF9F0A', '#E8790C'],
];

function gradientFor(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return chars.toUpperCase();
}

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }): ReactNode {
  const subtitle = group.description || group.location || 'No description yet';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.groupCard, pressed && styles.groupCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={group.name}
    >
      {group.coverUrl ? (
        <Image source={{ uri: group.coverUrl }} style={styles.groupAvatar} />
      ) : (
        <LinearGradient
          colors={gradientFor(group.id)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.groupAvatar}
        >
          <Text style={styles.groupAvatarText}>{initials(group.name)}</Text>
        </LinearGradient>
      )}

      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.name}
          </Text>
          {group.myRole ? <RoleBadge role={group.myRole} /> : null}
        </View>
        <Text style={styles.groupMessage} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.groupMetaRow}>
          <Text style={styles.groupOnline}>● {group.memberCount} members</Text>
          {group.visibility === 'PRIVATE' ? (
            <Text style={styles.privateTag}>🔒 Private</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function GroupsScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');

  // Debounce keystrokes so each pause sends one server query, not one per key.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const groups = useGroupsInfinite(search);
  const items = useMemo(
    () => groups.data?.pages.flatMap((page) => page.groups) ?? [],
    [groups.data],
  );

  // Refetching an existing search (pull-to-refresh / new term), not paging.
  const isRefreshing = groups.isFetching && !groups.isLoading && !groups.isFetchingNextPage;

  return (
    <View style={styles.container}>
      {/* Header + search stay outside the list so the TextInput never remounts
          (a ListHeaderComponent would drop keyboard focus on each page load). */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => nav.navigate('groupForm')}
          accessibilityRole="button"
          accessibilityLabel="Create group"
        >
          <Text style={styles.createButtonText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={7} stroke="#6B7280" strokeWidth={1.8} />
          <Path d="M21 21l-4-4" stroke="#6B7280" strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups"
          placeholderTextColor="#6B7280"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {isRefreshing ? <ActivityIndicator size="small" color="#FF5A1F" /> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(group) => group.id}
        renderItem={({ item }) => (
          <GroupRow group={item} onPress={() => nav.navigate('groupDetail', { id: item.id })} />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => groups.refetch()}
            tintColor="#FF5A1F"
          />
        }
        onEndReached={() => {
          if (groups.hasNextPage && !groups.isFetchingNextPage) groups.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          groups.isLoading ? (
            <Loading />
          ) : groups.isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Couldn't load groups</Text>
              <Text style={styles.errorMsg}>{errorMessage(groups.error, t)}</Text>
              <Pressable style={styles.retryBtn} onPress={() => groups.refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <EmptyState
              message={
                search
                  ? 'No groups match your search.'
                  : 'No groups yet — create one to get started.'
              }
            />
          )
        }
        ListFooterComponent={
          groups.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footerSpinner} size="small" color="#FF5A1F" />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B0D', paddingTop: 62 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F2F3F5', letterSpacing: -0.52 },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 24 },

  searchContainer: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 22,
    marginHorizontal: 20,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: '#F2F3F5' },

  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 12,
  },
  groupCardPressed: { opacity: 0.85 },
  groupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  groupContent: { flex: 1, minWidth: 0 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  groupName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#F2F3F5' },
  groupMessage: { fontSize: 13, fontWeight: '500', color: '#9AA0AB', marginBottom: 5 },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupOnline: { fontSize: 11, fontWeight: '600', color: '#30D158' },
  privateTag: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  footerSpinner: { marginVertical: 16 },

  errorBox: {
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 15, fontWeight: '700', color: '#FF453A' },
  errorMsg: { fontSize: 13, color: '#9AA0AB', textAlign: 'center', marginTop: 6 },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FF5A1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
