import { type ReactNode } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { BlockedUser } from '@moto/contract';
import { Header, EmptyState, Loading } from '../components/layout';
import { useBlockList } from '../api/queries';
import { useUnblockUser } from '../chat/hooks';
import { colors, spacing } from '../theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

export function BlockListScreen(): ReactNode {
  const { t } = useTranslation();
  const blocked = useBlockList();
  const unblock = useUnblockUser();

  function confirmUnblock(entry: BlockedUser): void {
    const name = entry.user.displayName ?? 'this rider';
    Alert.alert('Unblock', `Unblock ${name}? They'll be able to message you again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => unblock.mutate(entry.user.id) },
    ]);
  }

  return (
    <View style={styles.flex}>
      <Header title="Blocked riders" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {blocked.isLoading ? <Loading /> : null}
        {blocked.data && blocked.data.length === 0 ? (
          <EmptyState message="You haven't blocked anyone." />
        ) : null}
        {blocked.data?.map((entry) => {
          const name = entry.user.displayName ?? 'Rider';
          return (
            <View key={entry.id} style={styles.row}>
              {entry.user.avatarUrl ? (
                <Image source={{ uri: entry.user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initials(name)}</Text>
                </View>
              )}
              <Text style={styles.name}>{name}</Text>
              <Pressable style={styles.unblockBtn} onPress={() => confirmUnblock(entry)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing(2), gap: spacing(1.5) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing(1.5),
  },
  avatar: { width: 44, height: 44, borderRadius: 14 },
  avatarFallback: { backgroundColor: '#23272F', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.text },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  unblockBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
