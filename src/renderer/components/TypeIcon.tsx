import React from 'react';

const ICONS = {
  login: '\uD83C\uDF10',       // 🌐
  key: '\uD83D\uDD11',         // 🔑
  note: '\uD83D\uDCDD',        // 📝
  disc: '\uD83D\uDCBF',        // 💿
  card: '\uD83D\uDCB3',        // 💳
  bank: '\uD83C\uDFE6',        // 🏦
  person: '\uD83D\uDC64',      // 👤
  wifi: '\uD83D\uDCF6',        // 📶
  doc: '\uD83D\uDCC4',         // 📄
  passport: '\uD83D\uDEC2',    // 🛂
  index: '\uD83D\uDCC7',       // 📇
  star: '\u2B50',               // ⭐
  mail: '\u2709\uFE0F',        // ✉️
  computer: '\uD83D\uDDA5\uFE0F', // 🖥️
  cabinet: '\uD83D\uDDC4\uFE0F',  // 🗄️
  lock: '\uD83D\uDD12',        // 🔒
};

const typeIcons: Record<string, string> = {
  'webforms.WebForm': ICONS.login,
  'passwords.Password': ICONS.key,
  'securenotes.SecureNote': ICONS.note,
  'software_licenses.SoftwareLicense': ICONS.disc,
  'wallet.financial.CreditCard': ICONS.card,
  'wallet.financial.BankAccountUS': ICONS.bank,
  'wallet.financial.BankAccountCA': ICONS.bank,
  'wallet.financial.BankAccountAU': ICONS.bank,
  'wallet.financial.BankAccountUK': ICONS.bank,
  'wallet.financial.BankAccountDE': ICONS.bank,
  'identities.Identity': ICONS.person,
  'wallet.computer.Router': ICONS.wifi,
  'wallet.computer.License': ICONS.disc,
  'wallet.government.DriversLicense': ICONS.doc,
  'wallet.government.SsnUS': ICONS.doc,
  'wallet.government.Passport': ICONS.passport,
  'wallet.membership.Membership': ICONS.index,
  'wallet.membership.RewardProgram': ICONS.star,
  'wallet.onlineservices.Email.v2': ICONS.mail,
  'wallet.onlineservices.GenericAccount': ICONS.computer,
  'wallet.computer.Database': ICONS.cabinet,
  'wallet.computer.UnixServer': ICONS.computer,
};

export default function TypeIcon({ typeName }: { typeName: string }) {
  const icon = typeIcons[typeName] || ICONS.lock;
  return <span className="type-icon">{icon}</span>;
}
