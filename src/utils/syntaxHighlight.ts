import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
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
    case 'scss':
      return 'css';
    case 'html':
    case 'svg':
      return 'html';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash';
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
  const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.markup;

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
