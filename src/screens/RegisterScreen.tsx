import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmailSchema, PasswordSchema } from '@moto/contract';
import { useNavigation } from '../navigation/Navigator';
import { useRegister } from '../auth/mutations';
import { errorMessage } from '../api/errorMessage';
import { passwordStrength, strengthKey } from '../auth/passwordStrength';

export function RegisterScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const register = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const strength = passwordStrength(password);

  function onSubmit(): void {
    setValidationError(null);
    if (!EmailSchema.safeParse(email).success) {
      setValidationError(t('errors.validation.email'));
      return;
    }
    if (displayName.trim().length === 0) {
      setValidationError(t('errors.validation.displayName'));
      return;
    }
    if (!PasswordSchema.safeParse(password).success) {
      setValidationError(t('errors.validation.password'));
      return;
    }
    register.mutate({ email: email.trim(), password, displayName: displayName.trim() });
  }

  const error = validationError ?? (register.error ? errorMessage(register.error, t) : null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Subtitle */}
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join your crew on Moto.</Text>

        {/* Email Field */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@ride.co"
            placeholderTextColor="#6B7280"
            editable={!register.isPending}
          />
        </View>

        {/* Display Name Field */}
        <Text style={styles.label}>Display name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            placeholder="Your name"
            placeholderTextColor="#6B7280"
            editable={!register.isPending}
          />
        </View>

        {/* Password Field */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Create password"
            placeholderTextColor="#6B7280"
            editable={!register.isPending}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeIcon}>👁</Text>
          </TouchableOpacity>
        </View>

        {/* Password Strength */}
        {password.length > 0 ? (
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
          <Text style={styles.hint}>{t('register.passwordHint')}</Text>
        )}

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Create Account Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSubmit}
          disabled={register.isPending}
        >
          {register.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create account</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => nav.replace('login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
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

  // Title & Subtitle
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

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0AB',
    marginBottom: 8,
  },

  // Input Container
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

  // Password Container
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

  // Password Strength
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

  // Error Message
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF453A',
    marginBottom: 12,
  },

  // Primary Button
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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

  // Login Link
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5A1F',
  },
});
