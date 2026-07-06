import type {
  AuthResult,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  UserPublic,
  VerifyEmailRequest,
} from '@samishan11/moto-contract';
import { apiFetch } from './client';

/**
 * Thin, fully-typed wrappers over the backend's `/auth/*` routes. Request and
 * response shapes come from @samishan11/moto-contract — the same Zod schemas the API
 * validates against — so there is no type drift between client and server.
 */

export function registerRequest(body: RegisterRequest): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/register', { method: 'POST', body });
}

export function loginRequest(body: LoginRequest): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/login', { method: 'POST', body });
}

export function googleLoginRequest(body: GoogleLoginRequest): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/google', { method: 'POST', body });
}

export function logoutRequest(): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/logout', { method: 'POST', auth: true });
}

export function verifyEmailRequest(body: VerifyEmailRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/verify-email', { method: 'POST', body });
}

export function resendVerificationRequest(
  body: ResendVerificationRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/resend-verification', { method: 'POST', body });
}

export function forgotPasswordRequest(body: ForgotPasswordRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/forgot-password', { method: 'POST', body });
}

export function resetPasswordRequest(body: ResetPasswordRequest): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/reset-password', { method: 'POST', body });
}

export function meRequest(): Promise<UserPublic> {
  return apiFetch<UserPublic>('/auth/me', { auth: true });
}
