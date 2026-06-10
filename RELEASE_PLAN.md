# Centras CodeAI — Release Plan

## Status: Pre-Release (Weeks 1–4 complete, Weeks 5–8 in progress)

---

## Shipped ✅

### Security
- [x] Gemini API key removed from client bundle — lives only in Supabase Edge Function secrets
- [x] Single `ai-gateway` edge function replaces direct browser calls
- [x] Rate limiting: 60 req/hr (auth), 15 req/hr (anon) via `ai_calls` table
- [x] SHA-256 response cache in `ai_cache` table (saves LLM cost on repeated calls)
- [x] Grading verdict set server-side only (service role); clients cannot fake scores
- [x] `submissions` table: no client INSERT policy — only `ai-gateway` can insert
- [x] RLS on all tables; `is_staff()` security definer prevents recursion
- [x] Deleted `src/lib/gemini.ts` and `supabase/functions/review-homework/` (dead code)

### Database
- [x] Migration: `supabase/migrations/20260610000000_platform_core.sql`
  - cohorts, profiles (auto-create trigger), courses, course_modules, module_blocks
  - enrollments, progress, submissions, tour_events, ai_calls, ai_cache
- [x] Seed script: `scripts/export-content-seed.ts` → `supabase/seed.sql`

### Service Layer
- [x] `src/lib/aiGateway.ts` — single LLM client with demo-mode fallback
- [x] `src/lib/progressService.ts` — Supabase-primary + localStorage fallback
- [x] `src/lib/contentService.ts` — lazy-loads from DB, falls back to bundle
- [x] `src/lib/grading.ts` — three-layer grading: static + functional + rubric
- [x] `src/lib/consoleBridge.ts` — iframe sandbox console capture + functional tests
- [x] `src/lib/analytics.ts` — fire-and-forget tour funnel tracking

### Onboarding Tour
- [x] 5-step FSM: SELECT_PROJECT → WRITE_PROMPT → AUDIT_DIFF → DEBUG_ERROR → RUN_GRADER → TOUR_COMPLETED
- [x] Zustand persist (survives page reload)
- [x] 3 project templates: Coin Clicker, Quote Generator, Dev Card
- [x] Prompt Linter (structural + semantic, blocks weak prompts × 2)
- [x] Hybrid LLM engine (live Gemini → guardrails → deterministic fallback)
- [x] Diff-Auditor: Monaco DiffEditor, student approves/rejects every AI change
- [x] Loop Breaker: clears chat context, reverts to snapshot, sends only error log
- [x] AI Grader: functional tests in iframe + rubric criteria
- [x] Spotlight overlay for each step
- [x] Tour completion badge + standalone HTML artifact download
- [x] Anonymous funnel analytics (tour_events table, pre-auth)

### App Shell
- [x] React Router v6 migration (BrowserRouter, Routes/Route)
- [x] `/tour` route added to Navbar
- [x] `public/_redirects` for Netlify SPA routing
- [x] `progressService` wired into App.tsx (Supabase-primary)
- [x] `contentService` wired into App.tsx (async load, bundle fallback)
- [x] TeacherDashboard migrated from `homeworks` → `submissions` table
- [x] Mock Supabase client updated: upsert, maybeSingle, in, order, multi-eq chaining
- [x] CodeEditor + PromptBuilder: use `gradeSubmission()` from aiGateway

### Gemini Models (current)
- Grading: `gemini-2.5-flash` ($0.30/$2.50 per 1M in/out)
- Lint/Diff: `gemini-2.5-flash-lite` ($0.10/$0.40 per 1M in/out)
- ⚠️ `gemini-1.5-flash` was shut down June 1 2026 — fully removed

---

## In Progress 🔄

### Weeks 5–8 Content
Content for advanced weeks is not yet bundled. Routes and UI are ready.
- [ ] Week 5: Context Engineering — agents.md, CLAUDE.md, MCP intro
- [ ] Week 6: MCP + Real Data — Supabase MCP, live query in prompt
- [ ] Week 7: Agent Loops — multi-agent roles, Diff-Auditor as tool, loop orchestration
- [ ] Week 8: Production — security audit, auth patterns, deploy pipeline, monitoring

After authoring weeks 5–8:
1. Run `npx tsx scripts/export-content-seed.ts`
2. Push `supabase/seed.sql` via `supabase db push`
3. Update `index.html` meta description to reflect full 8-week scope

---

## Deployment Checklist

### Supabase Project Setup
- [ ] Create project at supabase.com
- [ ] Run migration: `supabase db push`  
  (or paste `supabase/migrations/20260610000000_platform_core.sql` into SQL editor)
- [ ] Seed content: `npx tsx scripts/export-content-seed.ts && supabase db push`
- [ ] Deploy edge function: `supabase functions deploy ai-gateway`
- [ ] Set secrets:
  ```bash
  supabase secrets set GEMINI_API_KEY=AIza...
  supabase secrets set GEMINI_MODEL=gemini-2.5-flash
  supabase secrets set GEMINI_MODEL_LITE=gemini-2.5-flash-lite
  ```

### Netlify Deploy
- [ ] Connect GitHub repo to Netlify
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Environment variables in Netlify dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Verify `public/_redirects` is present (SPA routing)

### Pre-Launch Smoke Tests
- [ ] Demo Mode works without any env vars (mock client active)
- [ ] Tour completes end-to-end: SELECT_PROJECT → badge
- [ ] Loop Breaker correctly resets context and applies fix
- [ ] Auth flow: sign up → sign in → sign out
- [ ] Week 1 practice submission returns score
- [ ] TeacherDashboard shows submissions
- [ ] Active week control locks/unlocks content for students
- [ ] Progress persists on device switch (Supabase mode)

### Cost Guard
- Rate limits (60/hr auth, 15/hr anon) protect against runaway spend
- Monitor `ai_calls` table for unusual usage patterns
- Response cache (`ai_cache`) de-dupes identical requests
- Estimated cost at 100 DAU: ~$5–15/month (Gemini 2.5 Flash pricing)

---

## Known Limitations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Weeks 5–8 not authored yet | Course claims 4 weeks, not 8 | index.html meta updated to reflect this |
| No mobile layout for Tour | Tour is desktop-only | Acceptable for MVP; add responsive layout post-launch |
| Sandpack avoided (Nodebox license) | No Node.js sandbox | Custom iframe sandbox covers all HTML/CSS/JS use cases |
| No email verification | Open sign-up | Add Supabase email confirmation in project settings |

---

*Generated 2026-06-10. Update after each sprint.*
