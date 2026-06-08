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
