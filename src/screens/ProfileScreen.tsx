import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, ScrollView, Alert, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { UserProfile } from '@moto/contract';
import { Button, Field, FormError } from '../components/ui';
import { DateField } from '../components/DateField';
import { Header, LinkRow, Loading, Page, Card } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../api/queries';
import { useDeleteAvatar, useUpdateProfile, useUploadAvatar } from '../profile/hooks';
import { errorMessage } from '../api/errorMessage';
import { pickImage } from '../lib/imagePicker';
import { colors, spacing } from '../theme';

export function ProfileScreen(): ReactNode {
  const { t } = useTranslation();
  const profile = useProfile();

  return (
    <View style={styles.flex}>
      {profile.data ? <ProfileContent profile={profile.data} /> : <Loading />}
    </View>
  );
}

function ProfileContent({ profile }: { profile: UserProfile }): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { clearSession } = useAuth();

  async function handleLogout(): Promise<void> {
    Alert.alert(t('common.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.signOut'),
        style: 'destructive',
        onPress: () => {
          clearSession().catch(console.error);
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={['#FF5A1F', '#FF8A3D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatarPlaceholder, styles.avatarGradient]}
          >
            <Text style={styles.avatarInitial}>
              {(profile.displayName ?? profile.email).charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <Text style={styles.displayName}>{profile.displayName || 'Rider'}</Text>
        <Text style={styles.email}>@{profile.email.split('@')[0]} · Joined 2022</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>24.8k</Text>
          <Text style={styles.statLabel}>{t('profile.kmRidden')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>142</Text>
          <Text style={styles.statLabel}>{t('profile.rides')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>38</Text>
          <Text style={styles.statLabel}>{t('profile.buddies')}</Text>
        </View>
      </View>

      {/* Menu items - grouped card */}
      <Card>
        <LinkRow
          title={t('profile.nearby')}
          onPress={() => nav.navigate('nearby')}
          icon="🧭"
          hideBorder
        />
        <LinkRow
          title={t('contacts.title')}
          subtitle={t('contacts.subtitle')}
          onPress={() => nav.navigate('emergencyContacts')}
          icon="🚨"
          hideBorder
        />
        <LinkRow title="Medical Information" onPress={() => {}} icon="🩺" hideBorder />
        <LinkRow
          title="Privacy & Security"
          onPress={() => nav.navigate('settings')}
          icon="🔒"
          hideBorder
        />
        <LinkRow
          title={t('profile.settings')}
          onPress={() => nav.navigate('settings')}
          icon="⚙️"
          noBorderBottom
        />
      </Card>

      {/* Sign out button */}
      <View style={styles.signOutButton}>
        <Button
          title={t('common.signOut')}
          onPress={handleLogout}
          variant="destructive"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120, paddingTop: 20, paddingHorizontal: spacing(2) },
  avatarSection: { alignItems: 'center', marginBottom: spacing(3) },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing(1.5),
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1.5),
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  avatarGradient: {
    backgroundColor: undefined,
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing(0.5) },
  email: { fontSize: 13, color: colors.muted, marginBottom: spacing(1.5) },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  statCard: {
    flex: 1,
    padding: spacing(2),
    backgroundColor: colors.fieldBg,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing(0.25) },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  signOutButton: { marginTop: spacing(2) },
});
