import { z } from "zod";

const namePart = z
  .string()
  .trim()
  .overwrite((value) => value.replace(/\s+/g, " "));

export function isParsuAccount(email: string) {
  return email.trim().toLowerCase().endsWith("@parsu.edu.ph");
}

export function needsSignupName(user: {
  email: string;
  nameConfirmedAt: string | null;
}) {
  return !isParsuAccount(user.email) && !user.nameConfirmedAt;
}

export const signupNameSchema = z.object({
  lastName: namePart.min(1, "Last name is required.").max(100),
  firstName: namePart.min(1, "First name is required.").max(100),
  middleName: namePart.max(100),
  extensionName: namePart.max(30),
});

export type SignupName = z.infer<typeof signupNameSchema>;

export function formatSignupName(name: SignupName) {
  return [name.firstName, name.middleName, name.lastName, name.extensionName]
    .filter(Boolean)
    .join(" ");
}
