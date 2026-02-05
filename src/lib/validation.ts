export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(fields: Record<string, any>, required: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of required) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === "") {
      errors.push({ field, message: `${field} est requis` });
    }
  }
  return errors;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!password || password.length < 6) {
    errors.push({ field: "password", message: "Le mot de passe doit contenir au moins 6 caractères" });
  }
  return errors;
}

export function validatePositiveNumber(value: any, field: string): ValidationError[] {
  if (value !== undefined && value !== null && (typeof value !== "number" || value < 0)) {
    return [{ field, message: `${field} doit être un nombre positif` }];
  }
  return [];
}

export function validateMaxLength(value: string | undefined | null, field: string, max: number): ValidationError[] {
  if (value && value.length > max) {
    return [{ field, message: `${field} ne peut pas dépasser ${max} caractères` }];
  }
  return [];
}
