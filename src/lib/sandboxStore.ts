/**
 * Локальное хранилище квот и «внутренних деплоев» для курса.
 *
 * Контекст: сервер у платформы один, без Docker — куратор раздаёт ресурсы
 * административно. Эти структуры моделируют квоту и сохраняют MVP ученика
 * как снимок, который можно открыть по адресу /preview/:id внутри платформы.
 *
 * В продакшене это, очевидно, должно жить в Supabase + RLS. Сейчас —
 * в localStorage, чтобы курс работал даже без подключённого backend.
 * Сервис-функции написаны так, чтобы UI-код не зависел от хранилища.
 */

import type { DeployedSnapshot, ResourceQuota } from '../types';

const QUOTA_KEY = 'centras_quotas_v1';
const DEPLOY_KEY = 'centras_deployments_v1';

const DEFAULT_QUOTA: Omit<ResourceQuota, 'studentId' | 'studentName'> = {
  ramMb: 512,
  cpuPercent: 25,
  maxDeploys: 3,
  maxRunSeconds: 300,
  notes: 'Системная квота песочницы курса. Куратор может изменить.',
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Квоты ────────────────────────────────────────────────────────────────

export function listQuotas(): ResourceQuota[] {
  return safeParse<ResourceQuota[]>(localStorage.getItem(QUOTA_KEY), []);
}

export function getQuotaForStudent(
  studentId: string,
  studentName = 'Студент',
): ResourceQuota {
  const all = listQuotas();
  const found = all.find((q) => q.studentId === studentId);
  if (found) return found;
  return {
    studentId,
    studentName,
    ...DEFAULT_QUOTA,
  };
}

export function upsertQuota(quota: ResourceQuota): void {
  const all = listQuotas();
  const idx = all.findIndex((q) => q.studentId === quota.studentId);
  if (idx >= 0) {
    all[idx] = quota;
  } else {
    all.push(quota);
  }
  localStorage.setItem(QUOTA_KEY, JSON.stringify(all));
}

export function removeQuota(studentId: string): void {
  const all = listQuotas().filter((q) => q.studentId !== studentId);
  localStorage.setItem(QUOTA_KEY, JSON.stringify(all));
}

// ── Деплои внутри платформы ──────────────────────────────────────────────

export function listDeployments(): DeployedSnapshot[] {
  return safeParse<DeployedSnapshot[]>(localStorage.getItem(DEPLOY_KEY), []);
}

export function listDeploymentsForStudent(studentId: string): DeployedSnapshot[] {
  return listDeployments().filter((d) => d.studentId === studentId);
}

export function getDeployment(id: string): DeployedSnapshot | null {
  return listDeployments().find((d) => d.id === id) ?? null;
}

export interface CreateDeploymentInput {
  studentId: string;
  projectName: string;
  html: string;
  css: string;
  js: string;
  weekId?: number;
}

export interface CreateDeploymentResult {
  ok: boolean;
  deployment?: DeployedSnapshot;
  reason?: 'quota_exceeded';
  current?: number;
  max?: number;
}

export function createDeployment(
  input: CreateDeploymentInput,
  quota: ResourceQuota,
): CreateDeploymentResult {
  const existing = listDeploymentsForStudent(input.studentId);
  if (existing.length >= quota.maxDeploys) {
    return {
      ok: false,
      reason: 'quota_exceeded',
      current: existing.length,
      max: quota.maxDeploys,
    };
  }

  const deployment: DeployedSnapshot = {
    id: `dep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    studentId: input.studentId,
    projectName: input.projectName,
    html: input.html,
    css: input.css,
    js: input.js,
    createdAt: new Date().toISOString(),
    weekId: input.weekId,
  };

  const all = listDeployments();
  all.unshift(deployment);
  localStorage.setItem(DEPLOY_KEY, JSON.stringify(all));

  return { ok: true, deployment };
}

export function deleteDeployment(id: string): void {
  const filtered = listDeployments().filter((d) => d.id !== id);
  localStorage.setItem(DEPLOY_KEY, JSON.stringify(filtered));
}

// ── Утилиты для UI ──────────────────────────────────────────────────────

export function defaultQuotaTemplate(): Omit<ResourceQuota, 'studentId' | 'studentName'> {
  return { ...DEFAULT_QUOTA };
}
