import Prism from 'prismjs';

// Ensure Prism is globally available before sub-languages load in Vite/ESM
if (typeof window !== 'undefined' && !(window as any).Prism) {
  (window as any).Prism = Prism;
}
if (typeof globalThis !== 'undefined' && !(globalThis as any).Prism) {
  (globalThis as any).Prism = Prism;
}

// Load syntax grammars in correct dependency order
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-diff';

/**
 * Maps filename or extension to a Prism supported grammar language
 */
export function getPrismLanguage(filenameOrLang: string): string {
  if (!filenameOrLang) return 'javascript';
  const clean = filenameOrLang.toLowerCase().trim();
  const ext = clean.includes('.') ? clean.split('.').pop() || '' : clean;

  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'html':
    case 'xml':
    case 'svg':
      return 'markup';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sql':
      return 'sql';
    case 'diff':
    case 'patch':
      return 'diff';
    default:
      return Prism.languages[ext] ? ext : 'javascript';
  }
}

/**
 * Safely highlights code using Prism with fallback to escaped HTML
 */
export function highlightCode(code: string, filenameOrLang: string): string {
  if (!code) return '';
  const lang = getPrismLanguage(filenameOrLang);
  const grammar =
    Prism.languages[lang] ||
    Prism.languages.typescript ||
    Prism.languages.javascript ||
    Prism.languages.markup;

  try {
    if (grammar) {
      return Prism.highlight(code, grammar, lang);
    }
  } catch (err) {
    console.warn('Prism highlight fallback:', err);
  }

  // Fallback to HTML escaped raw text
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
