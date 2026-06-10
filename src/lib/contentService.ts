// Контент-сервис: загрузка курса из Supabase (courses → modules → blocks)
// с фолбэком на бандл. Бандл-контент подключается динамическим import —
// в основной чанк приложения он не попадает.

import { supabase, isRealSupabaseConfigured } from '../supabaseClient';
import type { CourseModule, ResourceLink, Slide, PracticeTask, QuizQuestion } from '../types';

export const DEFAULT_COURSE_SLUG = 'vibe-coding-basics';

let modulesCache: CourseModule[] | null = null;
let resourcesCache: ResourceLink[] | null = null;

interface ModuleRow {
  id: string;
  position: number;
  title: string;
  duration: string;
  short_description: string;
  full_description: string;
  concept: string;
}

interface BlockRow {
  module_id: string;
  kind: 'slide' | 'practice' | 'quiz';
  position: number;
  payload: unknown;
}

function assembleModules(moduleRows: ModuleRow[], blockRows: BlockRow[]): CourseModule[] {
  return moduleRows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((m) => {
      const own = blockRows.filter((b) => b.module_id === m.id);
      const byKind = (kind: BlockRow['kind']) =>
        own.filter((b) => b.kind === kind).sort((a, b) => a.position - b.position);

      return {
        id: m.position,
        title: m.title,
        duration: m.duration,
        shortDescription: m.short_description,
        fullDescription: m.full_description,
        concept: m.concept,
        slides: byKind('slide').map((b) => b.payload as Slide),
        practice: (byKind('practice')[0]?.payload ?? null) as PracticeTask,
        quiz: byKind('quiz').map((b) => b.payload as QuizQuestion),
      } satisfies CourseModule;
    })
    .filter((m) => m.practice); // модуль без практики считаем неопубликованным
}

async function loadBundle() {
  return import('../content/courseData');
}

export async function loadCourseModules(slug = DEFAULT_COURSE_SLUG): Promise<CourseModule[]> {
  if (modulesCache) return modulesCache;

  if (isRealSupabaseConfigured) {
    try {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (course?.id) {
        const { data: moduleRows } = await supabase
          .from('course_modules')
          .select('id, position, title, duration, short_description, full_description, concept')
          .eq('course_id', course.id)
          .order('position');

        if (moduleRows?.length) {
          const { data: blockRows } = await supabase
            .from('module_blocks')
            .select('module_id, kind, position, payload')
            .in('module_id', (moduleRows as ModuleRow[]).map((m) => m.id));

          if (blockRows?.length) {
            const assembled = assembleModules(moduleRows as ModuleRow[], blockRows as BlockRow[]);
            if (assembled.length) {
              modulesCache = assembled;
              return assembled;
            }
          }
        }
      }
      console.info('contentService: курс в БД не найден или пуст — использую бандл-контент.');
    } catch (e) {
      console.warn('contentService: ошибка загрузки из БД, фолбэк на бандл.', e);
    }
  }

  const bundle = await loadBundle();
  modulesCache = bundle.courseModules;
  return modulesCache;
}

export async function loadResources(): Promise<ResourceLink[]> {
  if (resourcesCache) return resourcesCache;
  const bundle = await loadBundle();
  resourcesCache = bundle.resourceLinks;
  return resourcesCache;
}

/** Сброс кэша (используется админ-инструментами после правок контента) */
export function invalidateContentCache(): void {
  modulesCache = null;
  resourcesCache = null;
}
