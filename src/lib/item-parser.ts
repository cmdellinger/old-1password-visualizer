import type { WebFormField } from '../renderer/types';

/**
 * Extract form fields from a decrypted webforms.WebForm item.
 */
export function parseWebFormFields(decrypted: Record<string, unknown>): WebFormField[] {
  const fields = decrypted.fields as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(fields)) return [];

  return fields.map(f => ({
    name: String(f.name ?? ''),
    value: String(f.value ?? ''),
    type: String(f.type ?? ''),
    designation: String(f.designation ?? ''),
  }));
}

/**
 * Get a human-readable type name from the internal typeName.
 */
export function getTypeLabel(typeName: string): string {
  const map: Record<string, string> = {
    'webforms.WebForm': 'Login',
    'passwords.Password': 'Password',
    'securenotes.SecureNote': 'Secure Note',
    'software_licenses.SoftwareLicense': 'Software License',
    'wallet.financial.CreditCard': 'Credit Card',
    'wallet.financial.BankAccountUS': 'Bank Account',
    'wallet.financial.BankAccountCA': 'Bank Account',
    'wallet.financial.BankAccountAU': 'Bank Account',
    'wallet.financial.BankAccountUK': 'Bank Account',
    'wallet.financial.BankAccountDE': 'Bank Account',
    'identities.Identity': 'Identity',
    'wallet.computer.Router': 'Wireless Router',
    'wallet.computer.License': 'Software License',
    'wallet.government.DriversLicense': "Driver's License",
    'wallet.government.SsnUS': 'Social Security Number',
    'wallet.government.Passport': 'Passport',
    'wallet.membership.Membership': 'Membership',
    'wallet.membership.RewardProgram': 'Reward Program',
    'wallet.onlineservices.Email.v2': 'Email Account',
    'wallet.onlineservices.GenericAccount': 'Server',
    'wallet.computer.Database': 'Database',
    'wallet.computer.UnixServer': 'Server',
  };
  return map[typeName] || typeName;
}

/**
 * Get a short type category for icon selection.
 */
export function getTypeCategory(typeName: string): string {
  if (typeName.startsWith('webforms.')) return 'login';
  if (typeName.startsWith('passwords.')) return 'password';
  if (typeName.startsWith('securenotes.')) return 'note';
  if (typeName.startsWith('software_licenses.') || typeName === 'wallet.computer.License') return 'license';
  if (typeName.includes('CreditCard')) return 'creditcard';
  if (typeName.includes('BankAccount')) return 'bank';
  if (typeName.startsWith('identities.')) return 'identity';
  if (typeName.includes('DriversLicense') || typeName.includes('Passport') || typeName.includes('Ssn')) return 'id';
  if (typeName.includes('Membership') || typeName.includes('RewardProgram')) return 'membership';
  if (typeName.includes('Email')) return 'email';
  if (typeName.includes('Server') || typeName.includes('Database') || typeName.includes('Router') || typeName.includes('UnixServer')) return 'server';
  return 'generic';
}
