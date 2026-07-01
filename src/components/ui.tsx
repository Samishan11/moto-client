import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';

/** Scrollable, keyboard-aware container used by every auth screen. */
export function Screen({ children }: { children: ReactNode }): ReactNode {
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

export function Title({ children }: { children: ReactNode }): ReactNode {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }): ReactNode {
  return <Text style={styles.subtitle}>{children}</Text>;
}

interface FieldProps extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...props }: FieldProps): ReactNode {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'link';
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: ButtonProps): ReactNode {
  const isLink = variant === 'link';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        isLink ? styles.linkBtn : styles.primaryBtn,
        isDisabled && !isLink && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isLink ? colors.primary : colors.primaryText} />
      ) : (
        <Text style={isLink ? styles.linkText : styles.primaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ message }: { message?: string | null }): ReactNode {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Notice({
  message,
  tone = 'success',
}: {
  message?: string | null;
  tone?: 'success' | 'warning';
}): ReactNode {
  if (!message) return null;
  return (
    <View style={[styles.notice, tone === 'warning' && styles.noticeWarning]}>
      <Text style={[styles.noticeText, tone === 'warning' && styles.noticeWarningText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing(3),
    gap: spacing(1.5),
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing(1) },
  field: { gap: spacing(0.5) },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fieldBg,
    borderRadius: 10,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.25),
    fontSize: 16,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 26,
    elevation: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { paddingVertical: spacing(1), alignItems: 'center', height: 52, marginTop: 12 },
  linkText: { color: '#FF5A1F', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  error: { color: colors.error, fontSize: 14 },
  notice: {
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    borderRadius: 10,
    padding: spacing(1.5),
  },
  noticeWarning: { backgroundColor: colors.warningBg },
  noticeText: { color: colors.success, fontSize: 14 },
  noticeWarningText: { color: colors.warning },
});
