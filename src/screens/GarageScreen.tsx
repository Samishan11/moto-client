import { type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import type { Bike, Reminder } from '@moto/contract';
import { Button, Notice } from '../components/ui';
import { Card, EmptyState, Loading } from '../components/layout';
import { useNavigation } from '../navigation/Navigator';
import { useBikes, useReminders } from '../api/queries';
import { colors } from '../theme';

function reminderLabel(r: Reminder, t: TFunction): string {
  const what =
    r.kind === 'INSURANCE_EXPIRY' ? t('reminders.insurance') : t('reminders.registration');
  if (r.daysUntilDue < 0) return t('reminders.overdue', { what, days: -r.daysUntilDue });
  if (r.daysUntilDue === 0) return t('reminders.today', { what });
  return t('reminders.dueIn', { what, days: r.daysUntilDue });
}

// --- Real-data helpers (no fabricated numbers) ---

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Document-based health: derived from insurance + registration validity. */
function bikeHealth(bike: Bike): { pct: number; color: string } {
  const signals = [daysUntil(bike.insuranceExpiry), daysUntil(bike.registrationExpiry)].filter(
    (d): d is number => d !== null,
  );
  if (signals.length === 0) return { pct: 100, color: colors.success };
  const worst = Math.min(...signals);
  if (worst < 0) return { pct: 28, color: colors.danger };
  if (worst <= 30) return { pct: 62, color: colors.warning };
  return { pct: 100, color: colors.success };
}

/** Nearest upcoming/overdue document expiry, or null if none tracked. */
function nextService(bike: Bike): string | null {
  const items = [
    { label: 'Insurance', days: daysUntil(bike.insuranceExpiry) },
    { label: 'Registration', days: daysUntil(bike.registrationExpiry) },
  ].filter((i): i is { label: string; days: number } => i.days !== null);
  if (items.length === 0) return null;
  items.sort((a, b) => a.days - b.days);
  const { label, days } = items[0];
  if (days < 0) return `${label} expired`;
  if (days === 0) return `${label} due today`;
  if (days === 1) return `${label} due tomorrow`;
  return `${label} due in ${days} days`;
}

function subLine(bike: Bike): string {
  const year = bike.purchaseDate ? new Date(bike.purchaseDate).getFullYear().toString() : null;
  return [bike.cc ? `${bike.cc} cc` : null, year ?? bike.registrationNum]
    .filter(Boolean)
    .join(' · ');
}

function BikeIcon({ size, color }: { size: number; color: string }): ReactNode {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={5.5} cy={17} r={3.2} stroke={color} strokeWidth={1.6} />
      <Circle cx={18.5} cy={17} r={3.2} stroke={color} strokeWidth={1.6} />
      <Path
        d="M8.5 17h6l2-5h-9m1 5l-2-5H4m10 0l1.5-3H18"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BikeCard({
  bike,
  isPrimary,
  onPress,
}: {
  bike: Bike;
  isPrimary: boolean;
  onPress: () => void;
}): ReactNode {
  const photo = bike.photos[0]?.url;
  const health = bikeHealth(bike);
  const next = nextService(bike);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${bike.brand} ${bike.model}`}
    >
      {/* Header image / striped placeholder */}
      <View style={styles.cardHeader}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <Pattern
                  id="moto-stripes"
                  patternUnits="userSpaceOnUse"
                  width={24}
                  height={24}
                  patternTransform="rotate(25)"
                >
                  <Rect width={24} height={24} fill="#191c22" />
                  <Rect width={12} height={24} fill="#1c1f26" />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#moto-stripes)" />
            </Svg>
            <BikeIcon size={34} color="#fff" />
          </>
        )}
        {isPrimary ? (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>
          {bike.brand} {bike.model}
        </Text>
        {subLine(bike) ? <Text style={styles.cardSub}>{subLine(bike)}</Text> : null}

        {/* Health bar */}
        <View style={styles.healthRow}>
          <View style={styles.healthTrack}>
            <View
              style={[styles.healthFill, { width: `${health.pct}%`, backgroundColor: health.color }]}
            />
          </View>
          <Text style={[styles.healthPct, { color: health.color }]}>{health.pct}%</Text>
        </View>

        {/* Next-service pill (only when there's a real date) */}
        {next ? (
          <View style={styles.pill}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3v3m0 12v3m9-9h-3M6 12H3"
                stroke={colors.warning}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              <Circle cx={12} cy={12} r={3} stroke={colors.warning} strokeWidth={1.8} />
            </Svg>
            <Text style={styles.pillText}>{next}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function GarageScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const bikes = useBikes();
  const reminders = useReminders();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      {/* Inline header (matches design) */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('garage.title')}</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => nav.navigate('bikeForm')}
          accessibilityRole="button"
          accessibilityLabel={t('garage.add')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {reminders.data && reminders.data.length > 0 ? (
        <View style={styles.reminders}>
          <Text style={styles.sectionLabel}>{t('reminders.title')}</Text>
          {reminders.data.map((r) => (
            <Notice
              key={`${r.bikeId}-${r.kind}`}
              tone="warning"
              message={`${r.bikeLabel}: ${reminderLabel(r, t)}`}
            />
          ))}
        </View>
      ) : null}

      {bikes.isLoading ? <Loading /> : null}

      {bikes.data?.length === 0 ? (
        <Card>
          <EmptyState message={t('garage.empty')} />
          <Button title={t('garage.addFirst')} onPress={() => nav.navigate('bikeForm')} />
        </Card>
      ) : null}

      {bikes.data?.map((b, i) => (
        <BikeCard
          key={b.id}
          bike={b}
          isPrimary={i === 0}
          onPress={() => nav.navigate('bikeDetail', { id: b.id })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: colors.primary, fontSize: 24, fontWeight: '600', lineHeight: 26 },

  reminders: { gap: 6, marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  cardPressed: { opacity: 0.85 },
  cardHeader: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1f26',
  },
  cardImage: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  cardBody: { padding: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, fontWeight: '500', color: colors.muted, marginTop: 3 },

  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  healthTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#23272F',
    overflow: 'hidden',
  },
  healthFill: { height: '100%', borderRadius: 4 },
  healthPct: { fontSize: 13, fontWeight: '700' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,214,10,0.08)',
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.warning },
});
