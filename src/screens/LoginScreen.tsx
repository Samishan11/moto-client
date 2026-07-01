import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmailSchema } from '@moto/contract';
import { useNavigation } from '../navigation/Navigator';
import { useLogin } from '../auth/mutations';
import { errorMessage } from '../api/errorMessage';

export function LoginScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const login = useLogin();

  const [email, setEmail] = useState('alex@ride.co');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const error = validationError ?? (login.error ? errorMessage(login.error, t) : null);

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
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!login.isPending}
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
            editable={!login.isPending}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeIcon}>👁</Text>
          </TouchableOpacity>
        </View>

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
        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.googleButtonG}>G</Text>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
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
