import { describe, expect, it } from "vitest";
import { staffSignInStatus, validStaffEmail } from "@/lib/staffAccess";

const account = { account_id: "existing-account", email_confirmed_at: "2026-10-01", last_sign_in_at: null, banned_until: null };
describe("staff access", () => {
  it("does not mistake a linked or confirmed account for a real sign-in", () => {
    expect(staffSignInStatus(account)).toBe("Never signed in");
    expect(staffSignInStatus({ ...account, last_sign_in_at: "2026-10-29" })).toBe("Has signed in");
  });
  it("distinguishes absent and unconfirmed accounts", () => {
    expect(staffSignInStatus()).toBe("No account");
    expect(staffSignInStatus({ ...account, email_confirmed_at: null })).toBe("Email unconfirmed");
  });
  it("rejects malformed and missing staff emails", () => {
    expect(validStaffEmail("")).toBe(false);
    expect(validStaffEmail("not-an-email")).toBe(false);
    expect(validStaffEmail(" person@mydatapath.com ")).toBe(true);
  });
});