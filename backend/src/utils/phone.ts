export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidPhoneNumber(value: string): boolean {
  return value.length >= 10 && value.length <= 15;
}
