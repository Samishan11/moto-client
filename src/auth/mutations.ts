import { useMutation } from '@tanstack/react-query';
import {
  forgotPasswordRequest,
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  resendVerificationRequest,
  resetPasswordRequest,
  verifyEmailRequest,
} from '../api/auth';
import { useAuth } from './AuthContext';
import { currentPlatform, deviceName } from './device';

/**
 * React Query mutation hooks for the auth flow. Screens consume these for
 * `isPending`/`error` and call `.mutate()`; session side-effects (token
 * storage, cache seeding) live in the AuthContext primitives invoked here.
 */

export function useRegister() {
  const { applySession } = useAuth();
  return useMutation({
    mutationFn: (vars: { email: string; password: string; displayName: string }) =>
      registerRequest(vars),
    onSuccess: applySession,
  });
}

export function useLogin() {
  const { applySession } = useAuth();
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      loginRequest({ ...vars, deviceName: deviceName(), platform: currentPlatform() }),
    onSuccess: applySession,
  });
}

export function useGoogleLogin() {
  const { applySession } = useAuth();
  return useMutation({
    mutationFn: (idToken: string) =>
      googleLoginRequest({ idToken, deviceName: deviceName(), platform: currentPlatform() }),
    onSuccess: applySession,
  });
}

export function useLogout() {
  const { clearSession } = useAuth();
  return useMutation({
    mutationFn: () => logoutRequest(),
    // Always clear locally, even if the server revoke call fails.
    onSettled: () => clearSession(),
  });
}

export function useVerifyEmail() {
  const { reloadUser } = useAuth();
  return useMutation({
    mutationFn: (token: string) => verifyEmailRequest({ token }),
    onSuccess: async () => {
      // Reflect the new verified state if the user is signed in; ignore when
      // verifying via deep link before logging in.
      try {
        await reloadUser();
      } catch {
        // not signed in — fine
      }
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => resendVerificationRequest({ email }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPasswordRequest({ email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) => resetPasswordRequest(vars),
  });
}
