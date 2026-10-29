export type StaffSignIn = {
  account_id: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

export function staffSignInStatus(account?: StaffSignIn) {
  if (!account?.account_id) return "No account";
  if (account.banned_until && new Date(account.banned_until).getTime() > Date.now()) return "Sign-in blocked";
  if (account.last_sign_in_at) return "Has signed in";
  if (!account.email_confirmed_at) return "Email unconfirmed";
  return "Never signed in";
}

export function validStaffEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}