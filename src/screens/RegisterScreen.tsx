import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmailSchema, PasswordSchema } from '@moto/contract';
import { AuthField } from '../components/AuthField';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const nameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          placeholder="you@ride.co"
          editable={!register.isPending}
          returnKeyType="next"
          onSubmitEditing={() => nameRef.current?.focus()}
        />

        {/* Display Name Field */}
        <AuthField
          ref={nameRef}
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          placeholder="Your name"
          editable={!register.isPending}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        {/* Password Field */}
        <AuthField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          isPassword
          textContentType="newPassword"
          autoComplete="password-new"
          placeholder="Create password"
          editable={!register.isPending}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

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
  // Applied only to the actively-focused field (dynamic, not permanent).
  inputFocused: {
    borderColor: 'rgba(255,90,31,0.5)',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F2F3F5',
    flex: 1,
  },

  // Password Container — inherits base inputContainer; adds row layout for the eye toggle.
  passwordContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
