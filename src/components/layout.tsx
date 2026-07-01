import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '../navigation/Navigator';
import { colors, spacing } from '../theme';

/** Top bar with a back chevron and a title; optional right-side slot. */
export function Header({ title, right }: { title: string; right?: ReactNode }): ReactNode {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      {nav.canGoBack ? (
        <Pressable onPress={nav.goBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

/** Top-aligned, scrollable, keyboard-aware page body for lists and detail. */
export function Page({ children }: { children: ReactNode }): ReactNode {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children }: { children: ReactNode }): ReactNode {
  return <View style={styles.card}>{children}</View>;
}

/** Pressable row used for navigation lists (chevron on the right). */
export function LinkRow({
  title,
  subtitle,
  onPress,
  icon,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  icon?: string;
}): ReactNode {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function Loading(): ReactNode {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }): ReactNode {
  return <Text style={styles.empty}>{message}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  back: { width: 40, alignItems: 'center' },
  backText: { fontSize: 32, color: colors.primary, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  right: { minWidth: 40, alignItems: 'flex-end' },
  scroll: { padding: spacing(2), gap: spacing(1.5) },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing(2),
    gap: spacing(0.75),
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.75),
    gap: spacing(1),
    backgroundColor: colors.bg,
  },
  rowPressed: { opacity: 0.7 },
  rowIcon: { fontSize: 18 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.muted },
  loading: { paddingVertical: spacing(4), alignItems: 'center' },
  empty: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: spacing(3) },
});
