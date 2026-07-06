import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmailSchema } from '@moto/contract';
import { AuthField } from '../components/AuthField';
import { useNavigation } from '../navigation/Navigator';
import { useLogin } from '../auth/mutations';
import { useGoogleSignIn } from '../auth/googleSignIn';
import { errorMessage } from '../api/errorMessage';

export function LoginScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const login = useLogin();
  const google = useGoogleSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  function onSubmit(): void {
    setValidationError(null);
    if (!EmailSchema.safeParse(email).success) {
      setValidationError(t('errors.validation.email'));
      return;
    }
    if (password.length === 0) {
      setValidationError(t('errors.validation.password'));
      return;
    }
    login.mutate({ email: email.trim(), password });
  }

  const error =
    validationError ??
    (login.error ? errorMessage(login.error, t) : null) ??
    (google.error ? errorMessage(google.error, t) : null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏍️</Text>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to keep riding</Text>

        {/* Email Field */}
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="username"
          autoComplete="email"
          placeholder="you@ride.co"
          editable={!login.isPending}
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
          textContentType="password"
          autoComplete="current-password"
          placeholder="••••••••"
          editable={!login.isPending}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        {/* Forgot Password */}
        <TouchableOpacity onPress={() => nav.navigate('forgot')} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSubmit}
          disabled={login.isPending}
        >
          {login.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Button */}
        <TouchableOpacity
          style={[styles.googleButton, !google.ready && styles.googleButtonDisabled]}
          onPress={google.signIn}
          disabled={!google.ready || google.isPending || login.isPending}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          {google.isPending ? (
            <ActivityIndicator color="#F2F3F5" />
          ) : (
            <>
              <Text style={styles.googleButtonG}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* New Rider Link */}
        <View style={styles.newRiderContainer}>
          <Text style={styles.newRiderText}>New rider? </Text>
          <TouchableOpacity onPress={() => nav.replace('register')}>
            <Text style={styles.newRiderLink}>Create account</Text>
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

  // Logo
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FF5A1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
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

  // Forgot Password
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5A1F',
  },

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
    marginBottom: 22,
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

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Google Button
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#15171C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F2F3F5',
  },

  // New Rider
  newRiderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  newRiderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA0AB',
  },
  newRiderLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5A1F',
  },
});
