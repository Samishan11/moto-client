import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Role } from '@moto/contract';

/** Per-role accent colour + human label, shared across group screens. */
export const ROLE_COLOR: Record<Role, string> = {
  OWNER: '#FF5A1F',
  ADMIN: '#2E8BFF',
  MODERATOR: '#BF5AF2',
  RIDE_LEADER: '#30D158',
  MEMBER: '#9AA0AB',
};

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  RIDE_LEADER: 'Ride Leader',
  MEMBER: 'Member',
};

export function RoleBadge({ role }: { role: Role }): ReactNode {
  return (
    <View style={[styles.badge, { backgroundColor: `${ROLE_COLOR[role]}1F` }]}>
      <Text style={[styles.text, { color: ROLE_COLOR[role] }]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
