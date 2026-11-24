import { api } from "@/lib/api";

export type SignInResult = { token: string; isNewUser: boolean };
export type GoogleAccount = { id: string; name: string; email: string };

export const startRegistration = (identifier: string) =>
  api<{ identifier: string; resendInSec: number; devCode?: string }>("/auth/register/start", { body: { identifier } });

export const verifyOtp = (identifier: string, code: string) =>
  api<{ registrationToken: string }>("/auth/register/verify-otp", { body: { identifier, code } });

export const completeRegistration = (registrationToken: string, name: string, password: string) =>
  api<SignInResult>("/auth/register/complete", { body: { registrationToken, name, password } });

export const login = (identifier: string, password: string) => api<SignInResult>("/auth/login", { body: { identifier, password } });

export const fetchGoogleAccounts = () => api<{ accounts: GoogleAccount[] }>("/auth/google/accounts");

export const googleSignIn = (mockAccountId: string) => api<SignInResult>("/auth/google", { body: { mockAccountId } });
