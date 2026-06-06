/**
 * Password & Passphrase Generator
 * Cryptographically secure using crypto.getRandomValues()
 */

import type { GeneratorOptions, PasswordStrength } from '@/types';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'Il1O0';

// EFF Large Wordlist (subset — using a built-in word list for offline operation)
const WORD_LIST = [
  'abandon','ability','absent','access','account','achieve','acquire','across',
  'action','active','actual','address','adjust','advance','affect','afford',
  'afraid','agency','agree','ahead','allow','almost','alone','along','already',
  'always','amount','ancient','another','answer','appear','arrive','attach',
  'attack','attempt','autumn','average','awaken','balance','barrier','basket',
  'battle','beauty','become','before','behave','belief','belong','better',
  'billion','blossom','border','bottle','bottom','branch','breath','bridge',
  'bright','broken','bronze','butter','button','camera','candle','castle',
  'cattle','center','change','charge','choice','circle','city','classic',
  'climate','closed','cloudy','cobalt','coffee','colony','column','combat',
  'commit','common','copper','corner','cotton','couple','coupon','create',
  'credit','crisis','cross','culture','danger','debate','decide','define',
  'degree','delay','deliver','demand','desert','design','detail','detect',
  'diamond','differ','direct','divide','domain','double','driven','durable',
  'during','early','earth','eight','either','emerge','employ','enable','engine',
  'enough','entire','escape','estate','every','exact','exist','expert','extra',
  'fabric','factor','fallen','famous','father','feature','finger','forest',
  'formal','forward','fossil','found','fourth','frame','freely','freeze',
  'friend','front','frozen','future','garden','gather','gentle','global',
  'golden','govern','grant','great','green','group','growth','guard','guide',
  'handle','happen','harbor','health','heart','heavy','height','hidden','honor',
  'hotel','house','human','hundred','image','impact','import','income','index',
  'inform','inner','input','insect','inside','invest','island','issue','ivory',
  'jacket','jasper','jewel','jungle','junior','launch','layer','learn','level',
  'light','linear','liquid','listen','little','local','logic','lonely','lower',
  'magnet','market','master','matter','mature','metal','middle','million','model',
  'modern','moment','money','month','moral','mountain','muscle','music','nation',
  'nature','nearby','neither','noble','north','notice','novel','number','object',
  'obtain','offer','often','olive','online','option','order','origin','other',
  'output','patient','pattern','payment','perfect','permit','phrase','planet',
  'plunge','pocket','point','police','policy','portal','potential','power',
  'prefer','pretty','primary','private','product','profit','proper','protect',
  'prove','public','purple','pursue','puzzle','quarter','quick','rabbit','radio',
  'random','range','rapid','rather','reach','reason','record','reduce','reform',
  'region','relate','remain','report','require','result','return','reveal',
  'review','right','robust','rocket','secure','select','series','settle','seven',
  'shadow','silver','simple','single','social','solar','solid','south','spiral',
  'spring','stable','stage','standard','start','static','steady','stone','storm',
  'street','strong','summer','supply','support','surface','system','table','taken',
  'talent','target','teach','temple','theory','think','third','through','timber',
  'title','today','together','token','topic','total','tower','trace','trade',
  'train','trust','tunnel','ultra','under','union','unique','until','update',
  'upper','urban','using','valid','value','vapor','vault','vendor','venture',
  'vessel','vital','voice','water','welcome','wheat','wheel','where','while',
  'white','whole','wider','winter','within','wonder','world','worth','youth',
  'zebra','zenith','zero','zone',
];

function secureRandom(max: number): number {
  const bytes = new Uint32Array(1);
  const limit = 0xFFFFFFFF - (0xFFFFFFFF % max);
  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value > limit);
  return value % max;
}

function secureChoice<T>(arr: T[]): T {
  return arr[secureRandom(arr.length)];
}

export function generatePassword(options: GeneratorOptions): string {
  if (options.mode === 'passphrase') {
    return generatePassphrase(options);
  }
  if (options.mode === 'pin') {
    return Array.from({ length: options.length }, () => secureChoice(NUMBERS.split(''))).join('');
  }

  let charset = '';
  if (options.uppercase) charset += UPPERCASE;
  if (options.lowercase) charset += LOWERCASE;
  if (options.numbers) charset += NUMBERS;
  if (options.symbols) charset += (options.customSymbols || SYMBOLS);

  if (options.excludeAmbiguous) {
    charset = charset.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
  }

  if (!charset) charset = LOWERCASE + NUMBERS;

  // Ensure at least one character from each required charset
  const required: string[] = [];
  if (options.uppercase) required.push(secureChoice(getFilteredChars(UPPERCASE, options.excludeAmbiguous)));
  if (options.lowercase) required.push(secureChoice(getFilteredChars(LOWERCASE, options.excludeAmbiguous)));
  if (options.numbers) required.push(secureChoice(getFilteredChars(NUMBERS, options.excludeAmbiguous)));
  if (options.symbols) {
    const syms = options.customSymbols || SYMBOLS;
    required.push(secureChoice(syms.split('')));
  }

  const remaining = Array.from({ length: Math.max(0, options.length - required.length) }, () =>
    secureChoice(charset.split(''))
  );

  // Shuffle required + remaining together
  const all = [...required, ...remaining];
  return fisherYatesShuffle(all).join('');
}

function getFilteredChars(charset: string, excludeAmbiguous: boolean): string[] {
  return charset.split('').filter(c => !excludeAmbiguous || !AMBIGUOUS.includes(c));
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generatePassphrase(options: GeneratorOptions): string {
  const words: string[] = [];
  for (let i = 0; i < options.passphraseWords; i++) {
    let word = secureChoice(WORD_LIST);
    if (options.passphraseCapitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }
  return words.join(options.passphraseSeparator);
}

// ─── Entropy Calculation ──────────────────────────────────────────────────────

export function calculateEntropy(password: string): number {
  const charsetSize = estimateCharsetSize(password);
  return Math.log2(Math.pow(charsetSize, password.length));
}

function estimateCharsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32;
  return size || 26;
}

export function crackTimeFromEntropy(entropy: number): string {
  // Assuming 1 billion guesses/second (modern GPU cluster)
  const guessesPerSecond = 1e9;
  const avgGuesses = Math.pow(2, entropy) / 2;
  const seconds = avgGuesses / guessesPerSecond;

  if (seconds < 1) return 'instantly';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  return 'centuries';
}

export function scorePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Very Weak', entropy: 0, crackTime: 'instantly', suggestions: ['Enter a password'] };
  }

  const entropy = calculateEntropy(password);
  const crackTime = crackTimeFromEntropy(entropy);

  // Pattern-based penalties
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);
  const isLong = password.length >= 16;
  const hasRepeats = /(.)\1{2,}/.test(password);
  const isCommonPattern = /^(password|123456|qwerty|letmein|admin|welcome)/i.test(password);

  let score = 0;
  const suggestions: string[] = [];

  if (entropy >= 80 && isLong) score = 4;
  else if (entropy >= 60) score = 3;
  else if (entropy >= 40) score = 2;
  else if (entropy >= 25) score = 1;
  else score = 0;

  if (isCommonPattern) { score = Math.max(0, score - 2); suggestions.push('Avoid common passwords'); }
  if (hasRepeats) { score = Math.max(0, score - 1); suggestions.push('Avoid repeated characters'); }
  if (!hasUppercase) suggestions.push('Add uppercase letters');
  if (!hasLowercase) suggestions.push('Add lowercase letters');
  if (!hasNumbers) suggestions.push('Add numbers');
  if (!hasSymbols) suggestions.push('Add symbols');
  if (password.length < 12) suggestions.push('Use at least 12 characters');
  if (password.length < 16) suggestions.push('16+ characters is recommended');

  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const clampedScore = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;

  return {
    score: clampedScore,
    label: labels[clampedScore],
    entropy: Math.round(entropy),
    crackTime,
    suggestions: suggestions.slice(0, 3),
  };
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  customSymbols: '',
  mode: 'password',
  passphraseWords: 4,
  passphraseSeparator: '-',
  passphraseCapitalize: true,
};
