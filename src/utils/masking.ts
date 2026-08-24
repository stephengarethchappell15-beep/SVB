/**
 * Data Privacy and Masking Utilities
 * Follows institutional banking standards for masking sensitive financial data
 */

export function maskAccountNumber(
  accountNumber?: string | null,
  isRevealed: boolean = false
): string {
  if (!accountNumber) return '•••• 0000';
  if (isRevealed) return accountNumber;
  const clean = accountNumber.trim();
  const last4 = clean.length > 4 ? clean.slice(-4) : clean;
  return `•••• ${last4}`;
}

export function maskCardNumber(
  cardNumber?: string | null,
  isRevealed: boolean = false
): string {
  if (!cardNumber) return '•••• •••• •••• 0000';
  if (isRevealed) return cardNumber;
  const clean = cardNumber.replace(/\s+/g, '');
  const last4 = clean.length >= 4 ? clean.slice(-4) : clean;
  return `•••• •••• •••• ${last4}`;
}

export function maskRoutingNumber(
  routingNumber: string = '121141822',
  isRevealed: boolean = false
): string {
  if (isRevealed) return routingNumber;
  return `•••••${routingNumber.slice(-4)}`;
}

export function maskBalance(
  formattedBalance: string,
  isRevealed: boolean = true
): string {
  if (isRevealed) return formattedBalance;
  return '$ ••••••••';
}

export function maskEmail(
  email?: string | null,
  isRevealed: boolean = false
): string {
  if (!email) return '•••@••••';
  if (isRevealed) return email;
  const parts = email.split('@');
  if (parts.length !== 2) return '••••@••••';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 
    ? `${name[0]}*` 
    : `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}
