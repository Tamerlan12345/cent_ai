// Три стартовых проекта вводного тура. Каждый содержит полный сценарий:
// стартовые файлы → ожидаемый дифф (fallback) → сломанный JS (шаг 4) →
// заплатку Loop Breaker → рубрику и функциональные тесты грейдера.

import type { TourTemplate } from './tourTypes';

export const tourTemplates: TourTemplate[] = [
  // ───────────────────────── 1. Кликер монет ─────────────────────────
  {
    id: 'coin-clicker',
    title: 'Кликер Монет',
    emoji: '🪙',
    tagline: 'Мини-игра: клик по монете увеличивает счёт',
    goal: 'Игрок кликает по монете — счётчик растёт. Простая петля удовольствия.',
    brief: [
      '## Project Brief: Кликер Монет',
      '',
      '**G1 (Цель):** мини-игра, в которой клик по монете увеличивает счёт на 1.',
      '**Ценность:** мгновенная обратная связь — игрок видит результат каждого клика.',
      '**Интерфейс:** большая монета-кнопка `#coin` и счётчик `#counter`.',
      '**MVP-рамки:** без рекордов, без сохранения, без звука — только базовая петля.',
      '',
      'Стартовая разметка и стили уже в песочнице. Логики в `app.js` пока нет — её напишет ИИ по твоему промпту.',
    ].join('\n'),
    files: {
      html: `<div class="game">
  <h1>Кликер Монет</h1>
  <button id="coin" aria-label="Кликни по монете">🪙</button>
  <p class="score">Счёт: <span id="counter">0</span></p>
</div>`,
      css: `.game {
  max-width: 420px;
  margin: 2rem auto;
  text-align: center;
  font-family: system-ui, sans-serif;
}

#coin {
  font-size: 96px;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease;
}

#coin:active {
  transform: scale(0.9);
}

.score {
  font-size: 1.5rem;
  color: #00f2fe;
  font-weight: bold;
}`,
      js: `// app.js пока пуст.
// Логику клика добавит ИИ — по твоему промпту на следующем шаге.`,
    },
    requiredIds: ['#coin', '#counter'],
    examplePrompt:
      'Ты — фронтенд-разработчик. В index.html есть кнопка #coin и счётчик #counter. Добавь в app.js обработчик клика через addEventListener: при каждом клике по #coin число в #counter увеличивается на 1. Ванильный JS, без библиотек.',
    expectedDiff: {
      js: `const coin = document.getElementById('coin');
const counter = document.getElementById('counter');

let count = 0;

coin.addEventListener('click', () => {
  count = count + 1;
  counter.textContent = count;
});`,
      explanation:
        'Добавил слушатель клика на #coin через addEventListener: завёл переменную count и при каждом клике обновляю текст в #counter.',
    },
    brokenJs: `const coin = document.getElementById('coin');
const counter = document.getElementById('counter');

coin.addEventListener('click', () => {
  count = count + 1;
  counter.textContent = count;
});

// Показать стартовое значение счёта
counter.textContent = count;`,
    brokenErrorHint: 'ReferenceError: count is not defined',
    fixedJs: `const coin = document.getElementById('coin');
const counter = document.getElementById('counter');

// Заплатка: переменная состояния объявляется ДО первого использования
let count = 0;

coin.addEventListener('click', () => {
  count = count + 1;
  counter.textContent = count;
});

counter.textContent = count;`,
    fixExplanation:
      'Корень проблемы: переменная count использовалась, но нигде не была объявлена. Заплатка: явное объявление состояния let count = 0 до первого обращения. Правило вайб-кодера: состояние всегда объявляется до использования.',
    rubric: [
      'Клик по монете #coin увеличивает счётчик #counter ровно на 1',
      'Обработчик повешен через addEventListener (не inline onclick)',
      'В консоли нет ошибок выполнения',
    ],
    functionalTests: [
      {
        id: 'coin-exists',
        label: 'Монета #coin и счётчик #counter на месте',
        script: "return api.exists('#coin') && api.exists('#counter');",
      },
      {
        id: 'click-increments',
        label: 'Клик по монете увеличивает счёт на 1',
        script:
          "var before = parseInt(api.text('#counter') || '0', 10); api.click('#coin'); var after = parseInt(api.text('#counter') || '0', 10); return after === before + 1;",
      },
    ],
    staticSpec: {
      requiredSelectors: ['#coin', '#counter'],
      requiredJsPatterns: [
        { pattern: /addEventListener\s*\(\s*['"]click['"]/, label: 'Используется addEventListener("click", ...)' },
        { pattern: /\b(let|const|var)\s+\w*count/i, label: 'Переменная счёта объявлена явно' },
      ],
    },
  },

  // ───────────────────────── 2. Генератор цитат ─────────────────────────
  {
    id: 'quote-generator',
    title: 'Генератор Цитат',
    emoji: '💬',
    tagline: 'Кнопка выдаёт случайную мудрость дня',
    goal: 'По клику на кнопку показывается следующая цитата из коллекции.',
    brief: [
      '## Project Brief: Генератор Цитат',
      '',
      '**G1 (Цель):** по клику на кнопку показывать новую цитату из коллекции.',
      '**Ценность:** микро-дофамин — одна кнопка, всегда свежий результат.',
      '**Интерфейс:** блок цитаты `#quote` и кнопка `#next-quote`.',
      '**MVP-рамки:** 5 встроенных цитат, без API и без избранного.',
      '',
      'Разметка и стили готовы. Массив цитат и логику переключения добавит ИИ по твоему промпту.',
    ].join('\n'),
    files: {
      html: `<div class="quote-app">
  <h1>Генератор Цитат</h1>
  <blockquote id="quote">Нажми кнопку — получи мудрость.</blockquote>
  <button id="next-quote">Новая цитата</button>
</div>`,
      css: `.quote-app {
  max-width: 480px;
  margin: 2rem auto;
  text-align: center;
  font-family: system-ui, sans-serif;
}

#quote {
  min-height: 64px;
  font-size: 1.15rem;
  font-style: italic;
  color: #e2e8f0;
  border-left: 3px solid #9b5de5;
  padding: 0.75rem 1rem;
  margin: 1.5rem 0;
  text-align: left;
}

#next-quote {
  padding: 0.75rem 1.5rem;
  background: #9b5de5;
  color: #fff;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}`,
      js: `// app.js пока пуст.
// Массив цитат и переключение по клику добавит ИИ по твоему промпту.`,
    },
    requiredIds: ['#quote', '#next-quote'],
    examplePrompt:
      'Ты — фронтенд-разработчик. В index.html есть блок #quote и кнопка #next-quote. Добавь в app.js массив из 5 цитат о программировании и обработчик клика через addEventListener: каждый клик по #next-quote показывает в #quote следующую цитату по кругу. Ванильный JS.',
    expectedDiff: {
      js: `const quoteBox = document.getElementById('quote');
const nextBtn = document.getElementById('next-quote');

const quotes = [
  'Сначала реши задачу, потом пиши код. — Джон Джонсон',
  'Простота — залог надёжности. — Эдсгер Дейкстра',
  'Лучший код — тот, который не пришлось писать.',
  'Ошибки — это просто непрочитанные подсказки.',
  'Работает — не значит закончено. Закончено — значит понятно другим.'
];

let index = 0;

nextBtn.addEventListener('click', () => {
  index = (index + 1) % quotes.length;
  quoteBox.textContent = quotes[index];
});`,
      explanation:
        'Завёл массив quotes и индекс текущей цитаты; по клику на #next-quote показываю следующую цитату по кругу в #quote.',
    },
    brokenJs: `const quoteBox = document.getElementById('quote');
const nextBtn = document.getElementById('next-quote');

let index = 0;

nextBtn.addEventListener('click', () => {
  index = (index + 1) % quotes.length;
  quoteBox.textContent = quotes[index];
});

// Показать первую цитату при загрузке
quoteBox.textContent = quotes[0];`,
    brokenErrorHint: 'ReferenceError: quotes is not defined',
    fixedJs: `const quoteBox = document.getElementById('quote');
const nextBtn = document.getElementById('next-quote');

// Заплатка: данные объявляются ДО кода, который их использует
const quotes = [
  'Сначала реши задачу, потом пиши код. — Джон Джонсон',
  'Простота — залог надёжности. — Эдсгер Дейкстра',
  'Лучший код — тот, который не пришлось писать.',
  'Ошибки — это просто непрочитанные подсказки.',
  'Работает — не значит закончено. Закончено — значит понятно другим.'
];

let index = 0;

nextBtn.addEventListener('click', () => {
  index = (index + 1) % quotes.length;
  quoteBox.textContent = quotes[index];
});

quoteBox.textContent = quotes[0];`,
    fixExplanation:
      'Корень проблемы: код обращался к массиву quotes, который никогда не был объявлен. Заплатка: данные (массив цитат) объявлены до логики, которая их читает. Правило: сначала данные, потом поведение.',
    rubric: [
      'Клик по #next-quote меняет текст в #quote',
      'Цитаты хранятся в массиве, показ идёт по кругу без выхода за границы',
      'В консоли нет ошибок выполнения',
    ],
    functionalTests: [
      {
        id: 'quote-exists',
        label: 'Блок #quote и кнопка #next-quote на месте',
        script: "return api.exists('#quote') && api.exists('#next-quote');",
      },
      {
        id: 'click-changes-quote',
        label: 'Клик меняет цитату',
        script:
          "var before = api.text('#quote'); api.click('#next-quote'); var after = api.text('#quote'); return !!after && after !== before;",
      },
    ],
    staticSpec: {
      requiredSelectors: ['#quote', '#next-quote'],
      requiredJsPatterns: [
        { pattern: /addEventListener\s*\(\s*['"]click['"]/, label: 'Используется addEventListener("click", ...)' },
        { pattern: /\[\s*['"][^'"]+['"]/, label: 'Цитаты хранятся в массиве' },
      ],
    },
  },

  // ───────────────────────── 3. Визитка разработчика ─────────────────────────
  {
    id: 'dev-card',
    title: 'Визитка Разработчика',
    emoji: '🪪',
    tagline: 'Интерактивная карточка с кнопкой «Показать контакты»',
    goal: 'Кнопка раскрывает блок контактов на визитке.',
    brief: [
      '## Project Brief: Визитка Разработчика',
      '',
      '**G1 (Цель):** личная карточка, где кнопка показывает/прячет контакты.',
      '**Ценность:** контакты не мозолят глаза, но доступны в один клик.',
      '**Интерфейс:** кнопка `#contact-btn` и скрытый блок `#contact`.',
      '**MVP-рамки:** одна карточка, без формы связи и без анимаций.',
      '',
      'Разметка и стили готовы, блок контактов скрыт атрибутом hidden. Логику переключения добавит ИИ по твоему промпту.',
    ].join('\n'),
    files: {
      html: `<div class="card">
  <div class="avatar">🧑‍💻</div>
  <h1>Алекс Вайбов</h1>
  <p class="role">Вайб-кодер · строю MVP вместе с ИИ</p>
  <button id="contact-btn">Показать контакты</button>
  <div id="contact" hidden>
    <p>📮 alex@vibe.dev</p>
    <p>💬 @alexvibe</p>
  </div>
</div>`,
      css: `.card {
  max-width: 360px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  font-family: system-ui, sans-serif;
}

.avatar { font-size: 64px; }

.role { color: #9ca3af; margin: 0.5rem 0 1.5rem; }

#contact-btn {
  padding: 0.6rem 1.4rem;
  background: #00f2fe;
  color: #000;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

#contact p {
  margin: 0.75rem 0 0;
  color: #00f2fe;
}`,
      js: `// app.js пока пуст.
// Логику кнопки «Показать контакты» добавит ИИ по твоему промпту.`,
    },
    requiredIds: ['#contact-btn', '#contact'],
    examplePrompt:
      'Ты — фронтенд-разработчик. В index.html есть кнопка #contact-btn и скрытый блок #contact (атрибут hidden). Добавь в app.js обработчик клика через addEventListener: клик по #contact-btn переключает видимость #contact и меняет текст кнопки на «Скрыть контакты» и обратно. Ванильный JS.',
    expectedDiff: {
      js: `const contactBtn = document.getElementById('contact-btn');
const contactBlock = document.getElementById('contact');

contactBtn.addEventListener('click', () => {
  contactBlock.hidden = !contactBlock.hidden;
  contactBtn.textContent = contactBlock.hidden
    ? 'Показать контакты'
    : 'Скрыть контакты';
});`,
      explanation:
        'Повесил обработчик на #contact-btn: переключаю атрибут hidden у блока #contact и синхронно меняю надпись на кнопке.',
    },
    brokenJs: `const contactBtn = document.getElementById('contact-btn');

contactBtn.addEventListener('click', () => {
  contactBlock.hidden = !contactBlock.hidden;
  contactBtn.textContent = contactBlock.hidden
    ? 'Показать контакты'
    : 'Скрыть контакты';
});

// Спрятать контакты при загрузке
contactBlock.hidden = true;`,
    brokenErrorHint: 'ReferenceError: contactBlock is not defined',
    fixedJs: `const contactBtn = document.getElementById('contact-btn');
// Заплатка: ссылка на DOM-элемент получается ДО использования
const contactBlock = document.getElementById('contact');

contactBtn.addEventListener('click', () => {
  contactBlock.hidden = !contactBlock.hidden;
  contactBtn.textContent = contactBlock.hidden
    ? 'Показать контакты'
    : 'Скрыть контакты';
});

contactBlock.hidden = true;`,
    fixExplanation:
      'Корень проблемы: код использовал переменную contactBlock, но строка с document.getElementById для неё потерялась. Заплатка: все ссылки на DOM-элементы получаем в начале файла, до логики. Правило: сначала найди элементы, потом вешай поведение.',
    rubric: [
      'Клик по #contact-btn показывает скрытый блок #contact',
      'Повторный клик снова прячет контакты (переключение, а не одноразовый показ)',
      'В консоли нет ошибок выполнения',
    ],
    functionalTests: [
      {
        id: 'card-exists',
        label: 'Кнопка #contact-btn и блок #contact на месте',
        script: "return api.exists('#contact-btn') && api.exists('#contact');",
      },
      {
        id: 'click-toggles',
        label: 'Клик переключает видимость контактов',
        script:
          "var block = api.$('#contact'); var was = block.hidden; api.click('#contact-btn'); var shown = block.hidden !== was; api.click('#contact-btn'); var toggledBack = block.hidden === was; return shown && toggledBack;",
      },
    ],
    staticSpec: {
      requiredSelectors: ['#contact-btn', '#contact'],
      requiredJsPatterns: [
        { pattern: /addEventListener\s*\(\s*['"]click['"]/, label: 'Используется addEventListener("click", ...)' },
        { pattern: /hidden/, label: 'Видимость управляется через hidden' },
      ],
    },
  },
];

export function getTourTemplate(id: string | null): TourTemplate | null {
  return tourTemplates.find((t) => t.id === id) ?? null;
}
