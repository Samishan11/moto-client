import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Field, FormError, Notice, Screen, Subtitle, Title } from '../components/ui';
import { useNavigation } from '../navigation/Navigator';
import { useAuth } from '../auth/AuthContext';
import { useResendVerification, useVerifyEmail } from '../auth/mutations';
import { errorMessage } from '../api/errorMessage';

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmailScreen(): ReactNode {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { status, user } = useAuth();
  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const email =
    (typeof nav.params.email === 'string' ? nav.params.email : null) ?? user?.email ?? null;
  const initialToken = typeof nav.params.token === 'string' ? nav.params.token : '';

  const [token, setToken] = useState(initialToken);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const autoSubmitted = useRef(false);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function onVerify(rawToken: string): void {
    setValidationError(null);
    if (rawToken.trim().length === 0) {
      setValidationError(t('errors.validation.token'));
      return;
    }
    verify.mutate(rawToken.trim(), {
      onSuccess: () => {
        setVerified(true);
        // signedIn → the hook already reloaded the user → go home.
        // signedOut (verified via deep link before login) → go to login.
        if (status === 'signedIn') {
          nav.reset('home');
        } else {
          nav.reset('login', { notice: 'verify.success' });
        }
      },
    });
  }

  // Auto-submit a token that arrived via deep link.
  useEffect(() => {
    if (initialToken && !autoSubmitted.current) {
      autoSubmitted.current = true;
      onVerify(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  function onResend(): void {
    if (!email || cooldown > 0) return;
    setValidationError(null);
    resend.mutate(email, {
      onSuccess: () => {
        setResent(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    });
  }

  const error =
    validationError ??
    (verify.error
      ? errorMessage(verify.error, t)
      : resend.error
        ? errorMessage(resend.error, t)
        : null);

  return (
    <Screen>
      <Title>{t('verify.title')}</Title>
      <Subtitle>
        {email ? t('verify.subtitle', { email }) : t('verify.subtitleGeneric')}
      </Subtitle>
      <Notice message={verified ? t('verify.success') : resent ? t('verify.resent') : null} />

      <Field
        label={t('verify.tokenLabel')}
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <FormError message={error} />
      <Button
        title={t('verify.submit')}
        onPress={() => onVerify(token)}
        loading={verify.isPending}
      />
      <Button
        title={cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
        variant="link"
        disabled={!email || cooldown > 0 || resend.isPending}
        onPress={onResend}
      />
      {status === 'signedIn' ? (
        <Button title={t('verify.skip')} variant="link" onPress={() => nav.reset('home')} />
      ) : (
        <Button
          title={t('forgot.backToLogin')}
          variant="link"
          onPress={() => nav.reset('login')}
        />
      )}
    </Screen>
  );
}
