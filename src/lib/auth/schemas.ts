import { z } from "zod";

/**
 * Password Security Rules:
 * 1. Minimum 8 characters
 * 2. At least 1 number (0-9)
 * 3. At least 1 capital letter (A-Z)
 * 4. At least 1 small letter (a-z)
 * 5. At least 1 special character (!@#$%^&*...)
 */
export const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
export const PASSWORD_NUMBER_REGEX = /\d/;
export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_LOWERCASE_REGEX = /[a-z]/;

export interface PasswordAnalysis {
  minLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  score: number;
  percent: number;
  level: "weak" | "fair" | "good" | "strong";
  label: string;
}

/**
 * Evaluates password criteria and strength in real-time
 */
export function checkPasswordRequirements(password: string): PasswordAnalysis {
  const minLength = password.length >= 8;
  const hasNumber = PASSWORD_NUMBER_REGEX.test(password);
  const hasUppercase = PASSWORD_UPPERCASE_REGEX.test(password);
  const hasLowercase = PASSWORD_LOWERCASE_REGEX.test(password);
  const hasSpecialChar = PASSWORD_SPECIAL_CHAR_REGEX.test(password);

  const criteriaMet = [minLength, hasNumber, hasUppercase, hasLowercase, hasSpecialChar].filter(Boolean).length;

  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let label = "Weak";

  if (criteriaMet === 5 && password.length >= 12) {
    level = "strong";
    label = "Very Strong";
  } else if (criteriaMet === 5) {
    level = "strong";
    label = "Strong";
  } else if (criteriaMet >= 3) {
    level = "good";
    label = "Medium";
  } else if (criteriaMet >= 2) {
    level = "fair";
    label = "Fair";
  }

  return {
    minLength,
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    score: criteriaMet,
    percent: (criteriaMet / 5) * 100,
    level,
    label,
  };
}

/**
 * Sanitizes input text to prevent XSS and control character injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // strip angle brackets
    .trim();
}

/**
 * Zod Signup Validation Schema
 */
export const signupSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(60, "First name cannot exceed 60 characters")
      .regex(/^[A-Za-z\s'-]+$/, "First name contains invalid characters"),
    last_name: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(60, "Last name cannot exceed 60 characters")
      .regex(/^[A-Za-z\s'-]+$/, "Last name contains invalid characters"),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .max(255, "Email address is too long"),
    location: z
      .string()
      .trim()
      .min(2, "Location is required (e.g. London, UK / New York, US)")
      .max(100, "Location cannot exceed 100 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .refine((p) => PASSWORD_NUMBER_REGEX.test(p), "Password must contain at least 1 number")
      .refine((p) => PASSWORD_UPPERCASE_REGEX.test(p), "Password must contain at least 1 capital letter")
      .refine((p) => PASSWORD_LOWERCASE_REGEX.test(p), "Password must contain at least 1 small letter")
      .refine((p) => PASSWORD_SPECIAL_CHAR_REGEX.test(p), "Password must contain at least 1 special character"),
    confirm_password: z.string().min(1, "Please confirm your password"),
    // Honeypot field for bot mitigation (must remain empty)
    honeypot: z.string().max(0, "Bot detected").optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Zod Login Validation Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
  remember_me: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
