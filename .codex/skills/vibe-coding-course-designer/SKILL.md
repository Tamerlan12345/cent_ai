---
name: vibe-coding-course-designer
description: Design, audit, or extend the Centras CodeAI Russian vibe-coding curriculum, onboarding tour, interactive IDE practice, scenario trainers, AI hints, AI grading rubrics, slide structure, and beginner MVP pathway. Use when working on courseData.ts, TourPage, CodeEditor, PromptBuilder, training specs, weekly curriculum, Gemini/GPT/Gems/GPTs lessons, image/video generation lessons, sandbox UX, or security guardrails for AI-assisted learning.
---

# Vibe Coding Course Designer

## Core Goal

Design learning as a simulator, not as a slide library. Every module must move the beginner through:

`slide concept -> tiny checkpoint -> guided IDE mission -> hint ladder -> AI-like feedback -> rubric -> free sandbox continuation`.

Keep Russian-first language. Translate technical ideas into simple mental models, but keep industry terms such as Pull Request, diff, deploy, MVP, Prompt, Agent, DoD, LocalStorage.

## Inspect First

Before proposing or editing curriculum, read the relevant current source:

- `AGENTS.md` for project rules and content constraints.
- `src/types.ts` before changing slide/practice shapes.
- `src/content/courseData.ts` before adding slides, practices, quizzes, or resources.
- `src/components/tour/*` before changing onboarding.
- `src/components/CodeEditor.tsx`, `PromptBuilder.tsx`, `Quiz.tsx`, and `ModuleTimeline.tsx` before changing practice flow.
- `src/lib/aiGateway.ts`, `grading.ts`, `consoleBridge.ts`, and `sandboxStore.ts` before changing AI checks, sandbox execution, quotas, or deploys.

Separate decisions into:

- **Content**: topics, slides, tasks, quizzes, rubrics.
- **UX**: flow, layout, controls, progressive disclosure, state.
- **Runtime**: grading, iframe execution, storage, Supabase, quotas.

## Curriculum Spine

For the current 4-week beginner track, prefer this structure:

1. **Week 1: AI literacy and creative prompting**
   - Gemini, ChatGPT, GPTs, Gemini Gems, platform capabilities.
   - Prompt basics: role, goal, context, constraints, examples, output format.
   - Image and video generation basics: prompt anatomy, style refs, safety, iteration.
   - Homework: create a personal AI assistant/Gem/GPT brief plus 2 image/video prompts with critique.

2. **Week 2: IDE onboarding and mini-game missions**
   - What an IDE is, files, HTML/CSS/JS, DOM, events, state, render.
   - Guided practice opens after slides: task block + Monaco IDE + preview + stepper.
   - Two small games from prepared scenarios, with simulated AI hints and grading.
   - Teach snapshots, diff reading, "push" as publish/share mental model, and internal deploy.

3. **Week 3: Own MVP selection and first build**
   - Choose project direction, user, pain, scenario, scope.
   - Convert idea to Vibe Coding Canvas, Project Brief, AGENTS.md, TEST_PLAN.
   - Build MVP skeleton with dummy data first.
   - AI grades product clarity, scope realism, and first working scenario.

4. **Week 4: Finish MVP, QA, deploy, defense**
   - Security basics, XSS, LocalStorage resilience, negative tests.
   - AI Red Team, Quality Gate, final internal deploy.
   - Defense deck and 3-minute presentation.
   - AI grades final MVP by rubric and recommends next roadmap.

Treat Weeks 5-8 as Level 2 only unless the user explicitly asks to expand the course: MCP, real data, multi-agent orchestration, production deployment, monitoring.

## Interactive Practice Pattern

For every guided practice, specify these states:

1. `intro`: goal, expected artifact, duration, success criteria.
2. `step`: one small action, one file or one prompt target.
3. `hint-1`: conceptual hint, no solution.
4. `hint-2`: targeted hint with file/selector/function.
5. `hint-3`: near-solution or generated patch for review.
6. `check`: static checks, functional tests, or rubric checks.
7. `ai-feedback`: concise coach response with score and next fix.
8. `unlock`: free sandbox continuation after required mission passes.

Prefer stepper missions over long instructions. Keep the primary task visible beside the IDE. Put secondary help behind a compact "Подсказка" or "AI-совет" control.

## Trainer Types

Use scenario trainers when the task is about behavior, not lecture content:

- `prompt-fix`: weak prompt -> improved prompt.
- `diff-audit`: approve/reject a proposed AI diff.
- `bug-reproduce`: reproduce a broken preview from exact steps.
- `loop-breaker`: stop an infinite fix loop and reset context.
- `dom-event`: attach behavior to an existing element.
- `state-render`: update state and re-render the screen.
- `local-storage`: save, load, and recover from broken JSON.
- `xss-lab`: find unsafe `innerHTML` and replace with escape/textContent.
- `quota-deploy`: handle internal deploy limits and explain tradeoffs.
- `ai-media-prompt`: improve an image/video generation prompt and critique output.

Each trainer needs: scenario, starting files or prompt, allowed actions, expected result, checks, feedback text, and "continue in sandbox" path.

## Slide Rules

Beginner slides should answer, in this order:

1. What is this?
2. Why does it matter for my project?
3. What can go wrong?
4. What exact move do I do in the platform?
5. How do I know it worked?

Avoid adding theory that does not feed a practice. Add glossary slides for new terms before asking students to use them.

## UX Rules

Use the existing UI system and keep the work surface calm:

- Preserve routes unless the user asks for navigation changes.
- Do not bury "Start practice" behind multiple choices after slides.
- Keep IDE, preview, current step, hints, and score reachable without page jumps.
- Use progressive disclosure for extra AI help.
- Show completion as concrete artifacts: prompt, diff decision, snapshot, deploy link, score.
- Keep cards shallow; do not nest cards inside cards.
- On mobile, allow reading and quiz flows; IDE missions may be desktop-first but must say so clearly.

## AI And Security Guardrails

For AI hints, grading, image/video generation, and future APIs:

- Never put provider keys in client code; use server/edge gateway.
- Validate task type, payload size, week/module id, and user role server-side.
- Rate-limit by user and anonymous id; use stricter limits for media generation.
- Store rubric verdicts server-side; clients may display but not self-approve.
- Keep iframe sandbox as `allow-scripts` without `allow-same-origin` unless a security review changes it.
- Treat student HTML/CSS/JS as untrusted; sanitize any rendered review text.
- Never ask students to paste real secrets, private customer data, tokens, or production credentials into AI prompts.
- For generated media, block requests for private persons, credentials, explicit material, hate, self-harm, or copyrighted logo misuse unless policy allows safe transformation.
- Log enough for abuse/cost audit, but do not log secrets or full sensitive prompts.

## Implementation Bias

Prefer:

- Extending `courseData.ts` and existing component props before adding new schemas.
- Reusing `consoleBridge`, `grading`, `aiGateway`, `sandboxStore`, `progressService`.
- Small typed unions over `any`.
- Deterministic checks before LLM checks.
- Existing CSS variables and component patterns.

Avoid:

- New dependencies for curriculum or UI-only changes.
- Unbounded "AI chat" surfaces with no task frame.
- One giant practice with no checkpoints.
- Silent changes to course length, public route behavior, auth, or grading.

## Output Format For Specs

When producing a ТЗ, include:

- Objective and audience.
- Current-state findings.
- Target learning journey.
- Week-by-week curriculum.
- Interaction model and screen states.
- Trainer catalog.
- AI grading and hinting model.
- Security and privacy guardrails.
- Data/types impact.
- Implementation phases.
- Verification checklist.
