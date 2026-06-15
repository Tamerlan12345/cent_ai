// Мост консоли песочницы: инжектируемый в iframe shim перехватывает
// console.*, window.onerror и unhandledrejection и шлёт их в родительское
// окно через postMessage. Тот же канал исполняет функциональные тесты
// (грейдинг v2, слой 2) внутри песочницы.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { CheckResult, FunctionalTest, SandboxFiles } from './grading';

export interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  ts: number;
}

interface BridgeMessage {
  __sandbox?: string;
  type?: 'console' | 'ready' | 'test-results';
  level?: ConsoleEntry['level'];
  text?: string;
  results?: { id: string; passed: boolean; error?: string }[];
}

/** Изолированный storage для sandboxed iframe без allow-same-origin. */
export const SANDBOX_STORAGE_SHIM = `
  (function () {
    function createStorage() {
      var data = Object.create(null);
      var MAX_KEYS = 100;
      var MAX_VALUE_LENGTH = 200000;
      return {
        get length() {
          return Object.keys(data).length;
        },
        key: function (index) {
          var keys = Object.keys(data);
          return keys[index] || null;
        },
        getItem: function (key) {
          var k = String(key);
          return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
        },
        setItem: function (key, value) {
          var k = String(key);
          var v = String(value);
          if (!Object.prototype.hasOwnProperty.call(data, k) && Object.keys(data).length >= MAX_KEYS) {
            throw new Error('Sandbox localStorage quota exceeded');
          }
          if (v.length > MAX_VALUE_LENGTH) {
            throw new Error('Sandbox localStorage value is too large');
          }
          data[k] = v;
        },
        removeItem: function (key) {
          delete data[String(key)];
        },
        clear: function () {
          data = Object.create(null);
        }
      };
    }

    function installStorage(name) {
      var storage = createStorage();
      try {
        Object.defineProperty(window, name, {
          value: storage,
          configurable: true
        });
      } catch (err) {
        window['__sandbox_' + name] = storage;
      }
    }

    installStorage('localStorage');
    installStorage('sessionStorage');
  })();
`;

/** Собирает полный srcDoc песочницы с console-shim и тест-раннером */
export function buildSandboxDoc(files: SandboxFiles, bridgeId: string): string {
  const bridgeScript = `
    (function () {
      var BRIDGE = ${JSON.stringify(bridgeId)};
      var post = function (msg) {
        msg.__sandbox = BRIDGE;
        parent.postMessage(msg, '*');
      };

      ['log', 'info', 'warn', 'error'].forEach(function (level) {
        var original = console[level];
        console[level] = function () {
          var parts = [];
          for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            try {
              parts.push(typeof a === 'object' ? JSON.stringify(a) : String(a));
            } catch (e) {
              parts.push(String(a));
            }
          }
          post({ type: 'console', level: level, text: parts.join(' ') });
          original.apply(console, arguments);
        };
      });

      window.addEventListener('error', function (e) {
        post({ type: 'console', level: 'error', text: e.message + (e.lineno ? ' (строка ' + e.lineno + ')' : '') });
      });
      window.addEventListener('unhandledrejection', function (e) {
        post({ type: 'console', level: 'error', text: 'Unhandled rejection: ' + String(e.reason) });
      });

      // API функциональных тестов
      var api = {
        $: function (sel) { return document.querySelector(sel); },
        exists: function (sel) { return !!document.querySelector(sel); },
        text: function (sel) {
          var el = document.querySelector(sel);
          return el ? (el.textContent || '').trim() : null;
        },
        click: function (sel) {
          var el = document.querySelector(sel);
          if (!el) throw new Error('Элемент не найден: ' + sel);
          el.click();
          return true;
        },
        type: function (sel, value) {
          var el = document.querySelector(sel);
          if (!el) throw new Error('Элемент не найден: ' + sel);
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      };

      window.addEventListener('message', function (ev) {
        var d = ev.data;
        if (!d || d.__runTests !== BRIDGE) return;
        var results = (d.tests || []).map(function (t) {
          try {
            var fn = new Function('api', t.script);
            return { id: t.id, passed: fn(api) === true };
          } catch (err) {
            return { id: t.id, passed: false, error: String(err) };
          }
        });
        post({ type: 'test-results', results: results });
      });

      window.addEventListener('DOMContentLoaded', function () {
        post({ type: 'ready' });
      });
    })();
  `;

  return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }

      /* Custom Scrollbar for Iframe */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0A0E17; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

      ${files.css}
    </style>
    <script>${SANDBOX_STORAGE_SHIM}</script>
    <script>${bridgeScript}</script>
  </head>
  <body>
    ${files.html}
    <script>${files.js}</script>
  </body>
</html>`;
}

/** Хук: слушает консоль конкретной песочницы */
export function useSandboxConsole(bridgeId: string) {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent<BridgeMessage>) => {
      const d = ev.data;
      if (!d || d.__sandbox !== bridgeId) return;
      if (d.type === 'console' && d.level && typeof d.text === 'string') {
        setEntries((prev) => [...prev.slice(-99), { level: d.level!, text: d.text!, ts: Date.now() }]);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [bridgeId]);

  const clear = useCallback(() => setEntries([]), []);
  const errors = entries.filter((e) => e.level === 'error');

  return { entries, errors, clear };
}

/** Ждёт, пока iframe песочницы сообщит, что DOM готов к functional tests. */
export function waitForSandboxReady(bridgeId: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(false);
    }, timeoutMs);

    const onMessage = (ev: MessageEvent<BridgeMessage>) => {
      const d = ev.data;
      if (!d || d.__sandbox !== bridgeId || d.type !== 'ready') return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(true);
    };

    window.addEventListener('message', onMessage);
  });
}

/** Запускает функциональные тесты внутри iframe песочницы. Таймаут → все failed. */
export function runFunctionalTests(
  iframe: HTMLIFrameElement | null,
  bridgeId: string,
  tests: FunctionalTest[],
  timeoutMs = 5000,
): Promise<CheckResult[]> {
  if (!tests.length) return Promise.resolve([]);
  const labelOf = (id: string) => tests.find((t) => t.id === id)?.label ?? id;

  return new Promise((resolve) => {
    if (!iframe?.contentWindow) {
      resolve(
        tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: 'Песочница не запущена' })),
      );
      return;
    }

    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(
        tests.map((t) => ({ id: t.id, label: t.label, passed: false, detail: 'Таймаут выполнения теста' })),
      );
    }, timeoutMs);

    const onMessage = (ev: MessageEvent<BridgeMessage>) => {
      const d = ev.data;
      if (!d || d.__sandbox !== bridgeId || d.type !== 'test-results') return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(
        (d.results ?? []).map((r) => ({
          id: r.id,
          label: labelOf(r.id),
          passed: r.passed,
          detail: r.error,
        })),
      );
    };

    window.addEventListener('message', onMessage);
    iframe.contentWindow.postMessage(
      { __runTests: bridgeId, tests: tests.map((t) => ({ id: t.id, script: t.script })) },
      '*',
    );
  });
}

/** Реф-обёртка для удобного доступа к iframe в компонентах */
export function useSandboxFrame() {
  return useRef<HTMLIFrameElement | null>(null);
}
