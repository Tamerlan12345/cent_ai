export interface DiagramStep {
  icon: string;
  label: string;
  desc: string;
  color?: string;
}

export interface KeyPoint {
  emoji: string;
  title: string;
  desc: string;
}

export interface Slide {
  id: string;
  title: string;
  type: 'text' | 'compare' | 'code' | 'interactive' | 'diagram' | 'checklist' | 'tips' | 'keypoints';
  content: string;
  emoji?: string;
  // code type
  codeSnippet?: string;
  codeLanguage?: string;
  // compare type
  badPrompt?: string;
  goodPrompt?: string;
  // checklist type
  items?: string[];
  // tips type
  tipsList?: string[];
  // diagram type
  diagramSteps?: DiagramStep[];
  // keypoints type
  keyPointsList?: KeyPoint[];
  // image support
  imageUrl?: string;
  imageCaption?: string;
}

export interface PracticeTask {
  id: string;
  title: string;
  type: 'prompt' | 'code';
  durationMinutes: number;
  description: string;
  steps: string[];
  expectedOutput: string;
  initialPrompt: {
    goal: string;
    context: string;
    constraints: string;
    dod: string;
  };
  hints: string[];
  checklist: string[];
  simulationFeedback: {
    score: number;
    comments: string[];
    agentResponse: string;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface CourseModule {
  id: number;
  title: string;
  duration: string;
  shortDescription: string;
  fullDescription: string;
  concept: string;
  slides: Slide[];
  practice: PracticeTask;
  quiz: QuizQuestion[];
}

export type ResourceCategory =
  | 'docs'
  | 'tools'
  | 'templates'
  | 'articles'
  | 'antigravity'
  | 'agents'
  | 'git'
  | 'mcp'
  | 'supabase'
  | 'security';

export interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  cohort_id: number;
}

/**
 * Машинная квота, которую куратор/админ выделяет ученику.
 * Сервер у проекта один и без Docker — ресурсы делим административно.
 * Эти значения отображаются ученику как «системные ограничения песочницы».
 */
export interface ResourceQuota {
  studentId: string;
  studentName: string;
  ramMb: number;        // например 512
  cpuPercent: number;   // например 25
  maxDeploys: number;   // сколько «деплоев» в платформе разрешено
  maxRunSeconds: number; // лимит на превью-сессию
  notes?: string;
}

/**
 * Внутренний «деплой» — сохранённый снапшот MVP ученика,
 * который можно открыть по ссылке /preview/:id внутри платформы.
 * Подменяет внешний хостинг во время обучения.
 */
export interface DeployedSnapshot {
  id: string;
  studentId: string;
  projectName: string;
  html: string;
  css: string;
  js: string;
  createdAt: string;
  weekId?: number;
}
