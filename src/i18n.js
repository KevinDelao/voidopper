import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';

const locales = { en, es, hi };
let currentLocale = 'en';
let strings = en;

function detectLocale() {
  const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
  const code = lang.split('-')[0].toLowerCase();
  if (locales[code]) return code;
  return 'en';
}

export function initI18n() {
  currentLocale = detectLocale();
  strings = locales[currentLocale] || en;
}

export function t(key, params) {
  let str = (strings && strings[key]) || en[key] || key;
  if (params) {
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      str = str.replace(new RegExp('\\{' + keys[i] + '\\}', 'g'), params[keys[i]]);
    }
  }
  return str;
}

export function getLocale() {
  return currentLocale;
}

// Auto-initialize on import
initI18n();
