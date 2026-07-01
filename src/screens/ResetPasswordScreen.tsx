import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PasswordSchema } from '@moto/contract';
import { useNavigation } from '../navigation/Navigator';
import { useResetPassword } from '../auth/mutations';
import { errorMessage } from '../api/errorMessage';
import { passwordStrength, strengthKey } from '../auth/passwordStrength';

export function ResetPasswordScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const reset = useResetPassword();

  const initialToken = typeof nav.params.token === 'string' ? nav.params.token : '';
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const strength = passwordStrength(newPassword);

  function onSubmit(): void {
    setValidationError(null);
    if (token.trim().length === 0) {
      setValidationError(t('errors.validation.token'));
      return;
    }
    if (!PasswordSchema.safeParse(newPassword).success) {
      setValidationError(t('errors.validation.password'));
      return;
    }
    reset.mutate(
      { token: token.trim(), newPassword },
      {
        onSuccess: () => nav.reset('login', { notice: 'reset.success' }),
      },
    );
  }

  const error = validationError ?? (reset.error ? errorMessage(reset.error, t) : null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>

        {/* Token Field (hidden/small) */}
        {!token && (
          <>
            <Text style={styles.label}>Reset Token</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Paste reset token here"
                placeholderTextColor="#6B7280"
                editable={!reset.isPending}
              />
            </View>
          </>
        )}

        {/* Password Field */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder="Create new password"
            placeholderTextColor="#6B7280"
            editable={!reset.isPending}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeIcon}>👁</Text>
          </TouchableOpacity>
        </View>

        {/* Password Strength */}
        {newPassword.length > 0 ? (
          <View style={styles.strengthRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.strengthBar, i < strength && styles.strengthBarOn]}
              />
            ))}
            <Text style={styles.strengthLabel}>{t(strengthKey[strength])}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>{t('reset.passwordHint')}</Text>
        )}

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSubmit}
          disabled={reset.isPending}
        >
          {reset.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => nav.reset('login')}
          disabled={reset.isPending}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B0D',
  },
  scrollContent: {
    paddingTop: 80,
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F2F3F5',
    letterSpacing: -0.52,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA0AB',
    marginBottom: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0AB',
    marginBottom: 8,
  },
  inputContainer: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 18,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F2F3F5',
    flex: 1,
  },
  passwordContainer: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.4)',
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    shadowColor: 'rgba(255,90,31,0.08)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  passwordInput: {
    flex: 1,
  },
  eyeIcon: {
    fontSize: 16,
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2E37',
  },
  strengthBarOn: { backgroundColor: '#30D158' },
  strengthLabel: { fontSize: 12, color: '#9AA0AB', marginLeft: 8 },
  hint: { fontSize: 12, color: '#9AA0AB', marginBottom: 24 },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF453A',
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9AA0AB',
  },
});
