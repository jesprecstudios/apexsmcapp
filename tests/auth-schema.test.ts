import { describe, it, expect } from "vitest";
import {
  checkPasswordRequirements,
  signupSchema,
  loginSchema,
  sanitizeInput,
} from "../src/lib/auth/schemas";

describe("Password Security & Requirements", () => {
  it("correctly identifies all 5 password requirements", () => {
    // Valid password meeting all criteria
    const valid = checkPasswordRequirements("ApexTrader#2026");
    expect(valid.minLength).toBe(true);
    expect(valid.hasNumber).toBe(true);
    expect(valid.hasUppercase).toBe(true);
    expect(valid.hasLowercase).toBe(true);
    expect(valid.hasSpecialChar).toBe(true);
    expect(valid.score).toBe(5);
    expect(valid.percent).toBe(100);
    expect(valid.level).toBe("strong");
  });

  it("flags missing requirements when criteria are absent", () => {
    // Missing number and special char
    const weak = checkPasswordRequirements("Password");
    expect(weak.minLength).toBe(true);
    expect(weak.hasNumber).toBe(false);
    expect(weak.hasUppercase).toBe(true);
    expect(weak.hasLowercase).toBe(true);
    expect(weak.hasSpecialChar).toBe(false);
    expect(weak.score).toBe(3);

    // Missing capital letter
    const noCap = checkPasswordRequirements("apex1234#");
    expect(noCap.hasUppercase).toBe(false);

    // Missing small letter
    const noSmall = checkPasswordRequirements("APEX1234#");
    expect(noSmall.hasLowercase).toBe(false);

    // Under 8 characters
    const short = checkPasswordRequirements("Ap1#");
    expect(short.minLength).toBe(false);
  });
});

describe("Signup Schema Validation", () => {
  const validPayload = {
    first_name: "Alexander",
    last_name: "Vance",
    email: "trader.vance@apexsmc.internal",
    location: "London, UK",
    password: "SecurePassword#99",
    confirm_password: "SecurePassword#99",
  };

  it("passes validation with all required fields and valid password", () => {
    const result = signupSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("fails when password and confirm_password do not match", () => {
    const result = signupSchema.safeParse({
      ...validPayload,
      confirm_password: "MismatchedPassword#99",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Passwords do not match");
    }
  });

  it("fails when password lacks required special character", () => {
    const result = signupSchema.safeParse({
      ...validPayload,
      password: "PasswordWithoutSpecial1",
      confirm_password: "PasswordWithoutSpecial1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("special character"))).toBe(true);
    }
  });

  it("fails when password lacks required number", () => {
    const result = signupSchema.safeParse({
      ...validPayload,
      password: "PasswordWithoutNumber!",
      confirm_password: "PasswordWithoutNumber!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("number"))).toBe(true);
    }
  });

  it("fails when honeypot field is filled by a bot", () => {
    const result = signupSchema.safeParse({
      ...validPayload,
      honeypot: "automated-bot-spam",
    });
    expect(result.success).toBe(false);
  });
});

describe("Sanitize Input Helper", () => {
  it("strips harmful script and HTML angle brackets", () => {
    const input = "<script>alert('xss')</script>Trader Name";
    const cleaned = sanitizeInput(input);
    expect(cleaned).toBe("scriptalert('xss')/scriptTrader Name");
  });
});

describe("Login Schema Validation", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "trader@apexsmc.com",
      password: "any-password-string",
      remember_me: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email formats", () => {
    const result = loginSchema.safeParse({
      email: "invalid-email-address",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});
