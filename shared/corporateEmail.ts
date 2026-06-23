const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.es", "yahoo.fr",
  "hotmail.com", "hotmail.co.uk", "hotmail.es", "hotmail.fr", "outlook.com",
  "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me", "tutanota.com", "tutamail.com",
  "mail.com", "gmx.com", "gmx.net", "yandex.com", "yandex.ru",
  "zoho.com", "inbox.com", "fastmail.com", "hey.com",
];

export function isCorporateEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1];
  if (!domain) return false;
  return !PERSONAL_EMAIL_DOMAINS.includes(domain);
}

export { PERSONAL_EMAIL_DOMAINS };
