import { useState, type ReactNode } from 'react';
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
import { useTranslation } from 'react-i18next';
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
  /** Marks the field "Optional" on the label row (default: fields read as required). */
  optional?: boolean;
  /** Faint helper text under the input; replaced by `error` when present. */
  hint?: string;
  /** Inline validation message — red ring + text under the input. */
  error?: string | null;
}

/** Canonical text input (design-file spec: 54px, radius 16, surface + hairline,
 * orange focus ring). Labels are muted 12px; errors take over the hint slot. */
export function Field({
  label,
  optional,
  hint,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: FieldProps): ReactNode {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>{t('common.optional')}</Text> : null}
      </View>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={colors.faint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'link' | 'destructive';
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: ButtonProps): ReactNode {
  const isLink = variant === 'link';
  const isDestructive = variant === 'destructive';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        isDestructive ? styles.destructiveBtn : isLink ? styles.linkBtn : styles.primaryBtn,
        isDisabled && !isLink && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDestructive ? '#FF453A' : isLink ? colors.primary : colors.primaryText}
        />
      ) : (
        <Text
          style={isDestructive ? styles.destructiveText : isLink ? styles.linkText : styles.primaryText}
        >
          {title}
        </Text>
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
  field: { gap: spacing(1) },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  optional: { fontSize: 12, fontWeight: '500', color: colors.faint },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing(2),
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  inputFocused: { borderColor: colors.fieldBorderFocus },
  inputError: { borderColor: 'rgba(255,69,58,0.5)' },
  hint: { fontSize: 12, fontWeight: '500', color: colors.faint },
  fieldError: { fontSize: 12, fontWeight: '600', color: colors.error },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  destructiveBtn: {
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
  },
  destructiveText: { color: '#FF453A', fontSize: 16, fontWeight: '600' },
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
