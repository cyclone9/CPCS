// Every piece of interface text. The build also fills {{key}} placeholders in index.html from here.
// Functions take values that are already formatted (Persian digits, bank names).

export const S = {
  // Word for word from CPBS brand.json text.fa; never edit here, copy from there.
  tagline: 'شماره‌ی کارت می‌دهید، تصویر کارت می‌گیرید.',
  motto: 'ابزار طراحی است، نه بیشتر.',

  pageTitle: 'استودیو کارت',
  metaDescription: 'شماره‌ی کارت، نام و بانک را بدهید و تصویر کارت را بگیرید. در مرورگر شما ساخته می‌شود و به هیچ سروری فرستاده نمی‌شود.',
  logoAlt: 'استودیو کارت',
  noscript: 'استودیو کارت برای کار کردن به جاوااسکریپت نیاز دارد.',

  themeToLight: 'پوسته‌ی روشن',
  themeToDark: 'پوسته‌ی تیره',

  previewLabel: 'پیش‌نمایش کارت',
  cardTitle: 'تصویر کارت بانکی',

  cardLabel: 'شماره‌ی کارت',
  cardPlaceholder: '0000 0000 0000 0000',
  cardEmpty: 'شماره‌ی ۱۶ رقمی کارت را وارد کنید.',
  cardShort: (n) => `${n} رقم از ۱۶ رقم وارد شده است.`,
  cardLuhn: 'این شماره‌ی کارت درست نیست. رقم‌ها را دوباره بررسی کنید.',
  cardValid: 'شماره‌ی کارت درست است.',
  clearCard: 'پاک کردن شماره‌ی کارت',

  bankLabel: 'بانک',
  bankAuto: 'تشخیص خودکار',
  bankAutoDetected: (bank) => `تشخیص خودکار: ${bank}`,
  bankSearchPlaceholder: 'نام بانک را بنویسید',
  bankNone: 'بانکی پیدا نشد',
  bankUnknown: 'بانک این کارت شناخته نشد. استودیو کارت فقط برای کارت بانک‌های فعال تصویر می‌سازد.',
  // current is null for a bank that was dissolved rather than merged.
  cardUnsupported: (oldName, current) => (current
    ? `این کارت مربوط به «${oldName}» است که در «${current}» ادغام شده است. استودیو کارت فقط از بانک‌های فعال پشتیبانی می‌کند و برای این کارت تصویر نمی‌سازد.`
    : `این کارت مربوط به «${oldName}» است که منحل شده است. استودیو کارت فقط از بانک‌های فعال پشتیبانی می‌کند و برای این کارت تصویر نمی‌سازد.`),

  ibanToggle: 'شماره‌ی شبا',
  ibanLabel: 'شماره‌ی شبا',
  ibanPlaceholder: 'IR00 0000 0000 0000 0000 0000 00',
  ibanEmpty: 'شماره‌ی شبا را با IR یا بدون آن وارد کنید.',
  ibanShort: (n) => `${n} رقم از ۲۴ رقم شماره‌ی شبا وارد شده است.`,
  ibanChecksum: 'این شماره‌ی شبا درست نیست. رقم‌ها را دوباره بررسی کنید.',
  ibanValid: (bank) => (bank ? `شماره‌ی شبا درست است. بانک: ${bank}` : 'شماره‌ی شبا درست است، ولی بانک آن شناخته نشد.'),
  ibanUnsupported: (oldName, current) => (current
    ? `این شماره‌ی شبا مربوط به «${oldName}» است که در «${current}» ادغام شده است. استودیو کارت فقط از بانک‌های فعال پشتیبانی می‌کند و برای این شماره‌ی شبا تصویر نمی‌سازد.`
    : `این شماره‌ی شبا مربوط به «${oldName}» است که منحل شده است. استودیو کارت فقط از بانک‌های فعال پشتیبانی می‌کند و برای این شماره‌ی شبا تصویر نمی‌سازد.`),
  clearIban: 'پاک کردن شماره‌ی شبا',
  ibanMismatch: (ibanBank, cardBank) => `بانک شماره‌ی شبا («${ibanBank}») با بانک کارت («${cardBank}») یکی نیست.`,

  nameLabel: 'نام صاحب کارت',
  namePlaceholder: 'نام و نام خانوادگی',
  nameOnCard: 'نام صاحب کارت',
  clearHolder: 'پاک کردن نام صاحب کارت',

  digitsLabel: 'رقم‌های روی کارت',
  digitsFa: 'فارسی',
  digitsEn: 'انگلیسی',

  templateLabel: 'قالب',
  templateFull: 'تمام‌رنگ',
  templateBand: 'نواری',

  colorLabel: 'رنگ کارت',
  colorReset: 'بازگشت به رنگ بانک',

  sizeLabel: 'اندازه‌ی تصویر',
  size1x: (w, h) => `کوچک (${w} × ${h})`,
  size2x: (w, h) => `بزرگ (${w} × ${h})`,
  smaller: 'حجم کمتر',
  smallerHint: 'برای کمتر شدن حجم، تصویر با ۲۵۶ رنگ ذخیره می‌شود.',

  download: 'دانلود تصویر',
  share: 'اشتراک‌گذاری',
  working: 'در حال ساخت تصویر…',
  fileSize: (kb) => `حجم فایل: ${kb} کیلوبایت`,
  needValidCard: 'برای دانلود، شماره‌ی کارت باید درست باشد.',
  needValidIban: 'برای دانلود، شماره‌ی شبا باید درست باشد.',
  exportFailed: 'ساختن تصویر ممکن نشد. دوباره امتحان کنید.',
  shareRetry: 'تصویر آماده شد. برای اشتراک‌گذاری دوباره دکمه را بزنید.',
  shareFailed: 'اشتراک‌گذاری ممکن نشد. تصویر را دانلود کنید.',

  privacy: 'همه‌چیز در همین مرورگر ساخته می‌شود. شماره، نام و تصویر به هیچ سروری فرستاده و جایی ذخیره نمی‌شود.',
  logosNotice: 'نشان هر بانک، علامت تجاری خود آن بانک است.',
  productLink: 'صفحه‌ی محصول',
  codeLink: 'کد',
  // The copyright line is English and left to right (owner's exception to the Persian-only interface).
  copyrightHolder: 'CyClone',
  fullName: 'CPCS - CyClone Power Card Studio',
  versionLabel: 'Version',

  toTop: 'بازگشت به بالا',
};
