export interface Slide {
  id: string;
  title: string;
  type: 'text' | 'compare' | 'code' | 'interactive';
  content: string;
  codeSnippet?: string;
  explanation?: string;
  badPrompt?: string;
  goodPrompt?: string;
  demoUrl?: string;
}

export interface PracticeTask {
  id: string;
  title: string;
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
    score: number; // 0-100 rating
    comments: string[]; // feedback on what was good/bad
    agentResponse: string; // simulated response markdown
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

export interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'docs' | 'tools' | 'templates' | 'articles';
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  cohort_id: number;
}

