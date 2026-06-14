import { useState } from 'react';
import {
  ArrowRight,
  Check,
  Clipboard,
  Layers3,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import './MvpCaseLab.css';

interface MvpCasePattern {
  id: string;
  title: string;
  icon: string;
  user: string;
  pain: string;
  entity: string;
  scenario: string[];
  features: [string, string, string];
  noHow: string;
  firstScreen: string;
  notInMvp: string[];
  risk: string;
}

const mvpCasePatterns: MvpCasePattern[] = [
  {
    id: 'habit-tracker',
    title: 'Трекер привычек',
    icon: '📝',
    user: 'Человек, который хочет держать одну привычку в фокусе.',
    pain: 'Прогресс теряется в голове, мотивация падает после пары пропусков.',
    entity: 'Привычка',
    scenario: ['Добавить привычку', 'Отметить день', 'Увидеть текущий прогресс'],
    features: ['Добавление привычки', 'Отметка выполнения', 'Список активных привычек'],
    noHow: 'Коуч-подсказка: почему привычка сорвалась и какой следующий мягкий шаг.',
    firstScreen: 'Форма добавления, список привычек, статус дня.',
    notInMvp: ['Аккаунты', 'Социальные челленджи', 'Сложная аналитика'],
    risk: 'LocalStorage можно очистить, поэтому на защите честно объясняем ограничение.',
  },
  {
    id: 'mini-crm',
    title: 'Мини-CRM заявок',
    icon: '📦',
    user: 'Фрилансер или менеджер, который ведёт входящие заявки вручную.',
    pain: 'Непонятно, кому ответить сегодня и какой следующий шаг по клиенту.',
    entity: 'Заявка',
    scenario: ['Добавить заявку', 'Выбрать статус', 'Получить приоритет ответа'],
    features: ['Форма заявки', 'Статусы', 'Приоритетный список'],
    noHow: 'Авто-приоритет: сегодня / на неделе / можно отложить.',
    firstScreen: 'Форма лида, фильтр статуса, список заявок.',
    notInMvp: ['Интеграция с почтой', 'Платежи', 'Командные роли'],
    risk: 'Легко раздуть до большой CRM, поэтому держим один экран и один список.',
  },
  {
    id: 'estimate-calculator',
    title: 'Калькулятор сметы',
    icon: '🧾',
    user: 'Мастер, консультант или малый бизнес, который быстро считает услугу.',
    pain: 'Цена каждый раз считается в чате, таблице или на листочке.',
    entity: 'Позиция сметы',
    scenario: ['Выбрать параметры', 'Получить цену', 'Скопировать объяснение клиенту'],
    features: ['Параметры услуги', 'Итоговая цена', 'Короткое объяснение'],
    noHow: 'Текст “почему такая цена” простым языком.',
    firstScreen: 'Поля параметров, блок итога, текст для клиента.',
    notInMvp: ['Онлайн-оплата', 'Склад', 'PDF-генерация'],
    risk: 'Смета должна быть прозрачной: формулы видны, магии нет.',
  },
  {
    id: 'employee-trainer',
    title: 'Тренажёр сотрудника',
    icon: '🎓',
    user: 'Новичок в команде, который учится отвечать клиентам.',
    pain: 'Теория прочитана, но в реальном диалоге непонятно, что сказать.',
    entity: 'Сценарий ответа',
    scenario: ['Выбрать ситуацию', 'Написать ответ', 'Получить разбор'],
    features: ['Список ситуаций', 'Поле ответа', 'Коуч-комментарий'],
    noHow: 'Оценка ответа по 3 критериям: ясно, спокойно, следующий шаг есть.',
    firstScreen: 'Карточка ситуации, textarea ответа, блок разбора.',
    notInMvp: ['Личный кабинет', 'Сертификаты', 'Реальные клиентские данные'],
    risk: 'Нельзя вставлять реальные обращения клиентов в промпты и демо.',
  },
  {
    id: 'product-picker',
    title: 'Подборщик товара',
    icon: '🛒',
    user: 'Покупатель, которому нужно быстро выбрать из похожих вариантов.',
    pain: 'Слишком много характеристик, непонятно, что важнее.',
    entity: 'Вариант товара',
    scenario: ['Ответить на 3 вопроса', 'Получить 3 варианта', 'Увидеть trade-off'],
    features: ['Вопросы', 'Подбор вариантов', 'Сравнение плюсов и минусов'],
    noHow: 'Честное сравнение: “лучше для цены / качества / скорости”.',
    firstScreen: 'Короткий опрос, три рекомендации, объяснение выбора.',
    notInMvp: ['Каталог на 1000 товаров', 'Корзина', 'Поставщики'],
    risk: 'Рекомендации должны быть объяснимыми, не “лучший товар вообще”.',
  },
  {
    id: 'quality-checklist',
    title: 'Чек-лист качества',
    icon: '📋',
    user: 'Специалист, который сдаёт работу и боится забыть важный пункт.',
    pain: 'Ошибки всплывают после сдачи, когда исправлять уже дороже.',
    entity: 'Пункт проверки',
    scenario: ['Отметить пункты', 'Увидеть риск', 'Получить план исправлений'],
    features: ['Список checks', 'Риск-скоринг', 'Первые 3 исправления'],
    noHow: 'Риск-скоринг: что исправить первым перед сдачей.',
    firstScreen: 'Группы checks, прогресс, блок “исправить сейчас”.',
    notInMvp: ['Командные шаблоны', 'История проверок', 'Интеграции'],
    risk: 'Чек-лист должен помогать принять решение, а не превращаться в 80 пунктов.',
  },
];

const buildPassport = (pattern: MvpCasePattern) => `# MVP Паспорт: ${pattern.title}

## Пользователь
${pattern.user}

## Боль
${pattern.pain}

## Сущность
${pattern.entity}

## Главный сценарий
${pattern.scenario.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## 3 функции MVP
${pattern.features.map((feature) => `- ${feature}`).join('\n')}

## Ноу-хау фишка
${pattern.noHow}

## Первый экран
${pattern.firstScreen}

## Не входит в MVP
${pattern.notInMvp.map((item) => `- ${item}`).join('\n')}

## Риск
${pattern.risk}`;

const buildAgentPrompt = (pattern: MvpCasePattern) => `Ты — продакт-ментор и агентный архитектор.

Помоги мне превратить кейс "${pattern.title}" в первый экран MVP.

Контекст:
- пользователь: ${pattern.user}
- боль: ${pattern.pain}
- сущность: ${pattern.entity}
- главный сценарий: ${pattern.scenario.join(' → ')}
- ноу-хау фишка: ${pattern.noHow}

Ограничения:
- только HTML/CSS/JS + LocalStorage;
- один экран;
- без авторизации, платежей, внешних API и базы данных;
- сначала Screen Map и PROJECT_BRIEF, код пока не писать.

Ответь в Markdown:
1. First Screen
2. Data Model
3. UI Blocks
4. 3 функции MVP
5. Что НЕ входит
6. Первый маленький diff для агента`;

export function MvpCaseLab() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState<'passport' | 'prompt' | null>(null);
  const activeCase = mvpCasePatterns[activeIndex];
  const passport = buildPassport(activeCase);
  const prompt = buildAgentPrompt(activeCase);

  const copyText = async (type: 'passport' | 'prompt', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="mvp-case-lab glass-panel" aria-labelledby="mvp-case-lab-title">
      <div className="mvp-case-lab-header">
        <div>
          <span className="mvp-case-eyebrow">
            <Sparkles size={14} /> MVP Case Lab
          </span>
          <h3 id="mvp-case-lab-title">Выберите сервис, который реально собрать</h3>
          <p>
            Один паттерн, один экран, одна ноу-хау фишка. Это мост между идеей,
            практикой в песочнице и будущей работой агента.
          </p>
        </div>
        <div className="mvp-case-live-badge">
          <Layers3 size={16} />
          <span>Live MVP Паспорт</span>
        </div>
      </div>

      <div className="mvp-case-layout">
        <div className="mvp-case-picker" role="list" aria-label="MVP кейсы">
          {mvpCasePatterns.map((pattern, index) => (
            <button
              key={pattern.id}
              type="button"
              role="listitem"
              aria-pressed={index === activeIndex}
              className={`mvp-case-option ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <span className="mvp-case-option-icon">{pattern.icon}</span>
              <span className="mvp-case-option-copy">
                <strong>{pattern.title}</strong>
                <small>{pattern.entity} → результат</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>

        <div className="mvp-passport-preview">
          <div className="mvp-passport-topline">
            <span className="mvp-passport-icon">{activeCase.icon}</span>
            <div>
              <span>Выбранный кейс</span>
              <strong>{activeCase.title}</strong>
            </div>
          </div>

          <div className="mvp-passport-grid">
            <div className="mvp-passport-block">
              <span>
                <Target size={13} /> Пользователь
              </span>
              <p>{activeCase.user}</p>
            </div>
            <div className="mvp-passport-block">
              <span>
                <ShieldCheck size={13} /> Риск
              </span>
              <p>{activeCase.risk}</p>
            </div>
          </div>

          <div className="mvp-scenario-strip">
            {activeCase.scenario.map((step, index) => (
              <div key={step} className="mvp-scenario-step">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <div className="mvp-feature-row">
            {activeCase.features.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>

          <div className="mvp-nohow-panel">
            <Lightbulb size={17} />
            <div>
              <span>Ноу-хау фишка</span>
              <p>{activeCase.noHow}</p>
            </div>
          </div>

          <div className="mvp-passport-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void copyText('passport', passport)}
            >
              {copied === 'passport' ? <Check size={14} /> : <Clipboard size={14} />}
              {copied === 'passport' ? 'Паспорт скопирован' : 'Скопировать паспорт'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void copyText('prompt', prompt)}
            >
              {copied === 'prompt' ? <Check size={14} /> : <Sparkles size={14} />}
              {copied === 'prompt' ? 'Промпт скопирован' : 'Промпт агенту'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
