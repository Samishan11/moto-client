import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmailSchema } from '@samishan11/moto-contract';
import { useNavigation } from '../navigation/Navigator';
import { useForgotPassword } from '../auth/mutations';
import { errorMessage } from '../api/errorMessage';

export function ForgotPasswordScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const forgot = useForgotPassword();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(): void {
    setValidationError(null);
    if (!EmailSchema.safeParse(email).success) {
      setValidationError(t('errors.validation.email'));
      return;
    }
    forgot.mutate(email.trim(), { onSuccess: () => setSent(true) });
  }

  const error = validationError ?? (forgot.error ? errorMessage(forgot.error, t) : null);

  if (sent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, styles.centerContent]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.successEmoji}>📧</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.successSubtitle}>We've sent a password reset link to {email}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => nav.navigate('login')}
          >
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>Enter your email to reset your password</Text>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="your@email.com"
            placeholderTextColor="#6B7280"
            editable={!forgot.isPending}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onSubmit}
          disabled={forgot.isPending}
        >
          {forgot.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => nav.canGoBack ? nav.goBack() : nav.replace('login')}
          disabled={forgot.isPending}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 24,
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
  successSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9AA0AB',
    marginBottom: 28,
    textAlign: 'center',
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
    marginBottom: 24,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F2F3F5',
    flex: 1,
  },
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
