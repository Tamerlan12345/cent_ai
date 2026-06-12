import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import './CodeHighlight.css';

/* ============================================================
   CodeHighlight — лёгкая подсветка синтаксиса без зависимостей.
   Собственный regex-токенизатор: код разбирается на токены и
   рендерится обычными React-элементами (никакого innerHTML),
   поэтому XSS через содержимое кода невозможен.
   ============================================================ */

/** Типы токенов, которые умеет различать токенизатор */
type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'value'
  | 'operator'
  | 'punctuation'
  | 'plain';

interface Token {
  type: TokenType;
  text: string;
}

/** Правило токенизации: тип токена + regex (компилируется со sticky-флагом) */
interface TokenRule {
  type: TokenType;
  pattern: string;
  flags?: string;
}

/** Внутренние идентификаторы поддерживаемых языков */
type LangId = 'js' | 'html' | 'css' | 'json' | 'bash' | 'plain';

/* ── Наборы правил по языкам.
   Порядок важен: первое совпавшее правило выигрывает. ── */

const JS_KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|' +
  'new|class|extends|super|import|from|export|default|try|catch|finally|throw|' +
  'async|await|yield|typeof|instanceof|in|of|this|null|undefined|true|false|void|delete|' +
  'interface|type|enum|implements|readonly|public|private|protected|static|abstract|' +
  'as|satisfies|keyof|infer|never|unknown|string|number|boolean|object|symbol|bigint';

const jsRules: TokenRule[] = [
  { type: 'comment', pattern: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)' },
  { type: 'string', pattern: '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`' },
  { type: 'keyword', pattern: `\\b(?:${JS_KEYWORDS})\\b` },
  { type: 'number', pattern: '\\b0[xXbBoO][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b' },
  { type: 'function', pattern: '[A-Za-z_$][\\w$]*(?=\\s*\\()' },
  { type: 'operator', pattern: '=>|\\.\\.\\.|[+\\-*/%=!<>&|?^~]+' },
  { type: 'punctuation', pattern: '[{}[\\]();,.:]' },
];

const cssRules: TokenRule[] = [
  { type: 'comment', pattern: '\\/\\*[\\s\\S]*?(?:\\*\\/|$)' },
  { type: 'string', pattern: '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'' },
  { type: 'keyword', pattern: '@[\\w-]+|!important\\b' },
  { type: 'tag', pattern: '[.#][a-zA-Z_][\\w-]*|::?[a-zA-Z-]+(?=[\\s,{(])' },
  { type: 'property', pattern: '--?[a-zA-Z-][\\w-]*(?=\\s*:)' },
  { type: 'function', pattern: '[a-zA-Z-]+(?=\\()' },
  { type: 'number', pattern: '#[\\da-fA-F]{3,8}\\b|-?\\b\\d+(?:\\.\\d+)?(?:px|rem|em|vh|vw|vmin|vmax|s|ms|fr|deg|ch|ex|%)?' },
  { type: 'operator', pattern: '[>~+*]' },
  { type: 'punctuation', pattern: '[{}();,:]' },
];

const htmlRules: TokenRule[] = [
  { type: 'comment', pattern: '<!--[\\s\\S]*?(?:-->|$)' },
  { type: 'keyword', pattern: '<!DOCTYPE[^>]*>', flags: 'i' },
  { type: 'tag', pattern: '<\\/?[a-zA-Z][\\w.:-]*|\\/?>' },
  { type: 'value', pattern: '"[^"]*"|\'[^\']*\'' },
  { type: 'attribute', pattern: '[a-zA-Z_:@][\\w.:-]*(?=\\s*=)' },
  { type: 'operator', pattern: '=' },
  { type: 'punctuation', pattern: '[{}();,]' },
];

const jsonRules: TokenRule[] = [
  { type: 'property', pattern: '"(?:\\\\.|[^"\\\\])*"(?=\\s*:)' },
  { type: 'string', pattern: '"(?:\\\\.|[^"\\\\])*"' },
  { type: 'keyword', pattern: '\\b(?:true|false|null)\\b' },
  { type: 'number', pattern: '-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b' },
  { type: 'punctuation', pattern: '[{}[\\],:]' },
];

const bashRules: TokenRule[] = [
  { type: 'comment', pattern: '#[^\\n]*' },
  { type: 'string', pattern: '"(?:\\\\.|[^"\\\\])*"|\'[^\']*\'' },
  {
    type: 'keyword',
    pattern:
      '\\b(?:if|then|else|elif|fi|for|in|do|done|while|case|esac|function|return|exit|' +
      'echo|cd|export|source|sudo|npm|npx|pnpm|yarn|node|git|mkdir|rm|cp|mv|cat|ls|touch|curl|chmod)\\b',
  },
  { type: 'property', pattern: '\\$\\{[^}]*\\}|\\$[\\w?#@*]+' },
  { type: 'attribute', pattern: '(?<=^|[\\s=])-{1,2}[a-zA-Z][\\w-]*' },
  { type: 'number', pattern: '\\b\\d+(?:\\.\\d+)?\\b' },
  { type: 'operator', pattern: '&&|\\|\\||[|&;<>]+' },
  { type: 'punctuation', pattern: '[{}[\\]()]' },
];

/** Нормализация названия языка из courseData к внутреннему идентификатору */
const normalizeLanguage = (raw?: string): LangId => {
  const lang = (raw || '').trim().toLowerCase();
  if (/^(js|jsx|ts|tsx|javascript|typescript|react)$/.test(lang)) return 'js';
  if (/^(html|xml|svg|markup)$/.test(lang)) return 'html';
  if (/^(css|scss|less)$/.test(lang)) return 'css';
  if (lang === 'json') return 'json';
  if (/^(bash|sh|shell|zsh|terminal|cmd|console)$/.test(lang)) return 'bash';
  return 'plain';
};

/** Человекочитаемое имя языка для бейджа в шапке окна */
const languageLabel = (raw?: string): string => {
  const lang = (raw || '').trim().toLowerCase();
  const map: Record<string, string> = {
    js: 'JavaScript', jsx: 'JSX', javascript: 'JavaScript',
    ts: 'TypeScript', tsx: 'TSX', typescript: 'TypeScript',
    react: 'React', html: 'HTML', xml: 'XML', svg: 'SVG',
    css: 'CSS', scss: 'SCSS', less: 'Less', json: 'JSON',
    bash: 'Bash', sh: 'Shell', shell: 'Shell', zsh: 'Zsh',
    terminal: 'Терминал', cmd: 'CMD', console: 'Консоль',
    markdown: 'Markdown', md: 'Markdown', text: 'Текст', plaintext: 'Текст',
  };
  return map[lang] || raw || 'Код';
};

const RULE_SETS: Record<LangId, TokenRule[]> = {
  js: jsRules,
  html: htmlRules,
  css: cssRules,
  json: jsonRules,
  bash: bashRules,
  plain: [],
};

/**
 * Токенизатор: идёт по строке и на каждой позиции пробует правила по порядку
 * (sticky-флаг `y` гарантирует совпадение ровно с текущей позиции).
 * Несовпавшие символы накапливаются в «plain»-токен.
 */
const tokenize = (code: string, lang: LangId): Token[] => {
  const rules = RULE_SETS[lang].map((r) => ({
    type: r.type,
    regex: new RegExp(r.pattern, (r.flags || '') + 'y'),
  }));

  const tokens: Token[] = [];
  let plainBuffer = '';
  let pos = 0;

  const flushPlain = (): void => {
    if (plainBuffer) {
      tokens.push({ type: 'plain', text: plainBuffer });
      plainBuffer = '';
    }
  };

  while (pos < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.regex.lastIndex = pos;
      const m = rule.regex.exec(code);
      if (m && m[0].length > 0) {
        flushPlain();
        tokens.push({ type: rule.type, text: m[0] });
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      plainBuffer += code[pos];
      pos += 1;
    }
  }
  flushPlain();
  return tokens;
};

/** Раскладывает плоский список токенов по строкам (токены с \n режутся) */
const splitTokensByLine = (tokens: Token[]): Token[][] => {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split('\n');
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
};

interface CodeHighlightProps {
  code: string;
  language?: string;
  title?: string;
  /** Номер строки (с 1), которую нужно подсветить фоном */
  highlightLine?: number | null;
  /** Колбэк клика по строке — получает номер строки (с 1) */
  onLineClick?: (line: number) => void;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  language,
  title,
  highlightLine = null,
  onLineClick,
}) => {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  // Чистим таймер фидбека при размонтировании
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const lines = useMemo(() => {
    // Убираем хвостовой перенос, чтобы не было пустой строки в конце
    const trimmed = code.replace(/\n$/, '');
    return splitTokensByLine(tokenize(trimmed, normalizeLanguage(language)));
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API недоступен (например, http без TLS) — молча игнорируем
    }
  }, [code]);

  const gutterWidth = String(lines.length).length;

  return (
    <div className="code-highlight" data-language={normalizeLanguage(language)}>
      {/* Шапка «как в IDE»: три точки, заголовок, бейдж языка, копирование */}
      <div className="ch-header">
        <div className="ch-dots" aria-hidden="true">
          <span className="ch-dot red" />
          <span className="ch-dot yellow" />
          <span className="ch-dot green" />
        </div>
        {title && <span className="ch-title">{title}</span>}
        <span className="ch-lang-badge">{languageLabel(language)}</span>
        <button
          type="button"
          className={`ch-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label="Скопировать код"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Скопировано' : 'Копировать'}</span>
        </button>
      </div>

      {/* Тело: номера строк + токены. Только React-элементы, без innerHTML */}
      <pre className="ch-body">
        <code className="ch-code">
          {lines.map((lineTokens, idx) => {
            const lineNumber = idx + 1;
            const isHighlighted = highlightLine === lineNumber;
            return (
              <span
                key={lineNumber}
                className={[
                  'ch-line',
                  isHighlighted ? 'highlighted' : '',
                  onLineClick ? 'clickable' : '',
                ].filter(Boolean).join(' ')}
                onClick={onLineClick ? () => onLineClick(lineNumber) : undefined}
              >
                <span
                  className="ch-line-number"
                  style={{ width: `${gutterWidth}ch` }}
                  aria-hidden="true"
                >
                  {lineNumber}
                </span>
                <span className="ch-line-content">
                  {lineTokens.length === 0
                    ? ' ' /* пустая строка — неразрывный пробел держит высоту */
                    : lineTokens.map((token, tIdx) =>
                        token.type === 'plain' ? (
                          <React.Fragment key={tIdx}>{token.text}</React.Fragment>
                        ) : (
                          <span key={tIdx} className={`tok-${token.type}`}>
                            {token.text}
                          </span>
                        )
                      )}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
};
