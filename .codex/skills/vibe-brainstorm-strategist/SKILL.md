---
name: vibe-brainstorm-strategist
description: Generate dense, implementation-aware brainstorms for Centras CodeAI, vibe-coding LMS strategy, interactive trainers, AI-agent workflows, teacher/student collaboration, course roadmap, feature prioritization, and product specs. Use when the user asks to think broadly, invent learning interactions, compare platform directions, plan iterations, or turn a raw idea into a prioritized set of buildable experiments without immediately editing application code.
---

# Vibe Brainstorm Strategist

Use this skill to expand a fuzzy product/course idea into a sharp option set. Stay bold, but keep every idea tied to a testable learning outcome, a small implementation slice, and a visible artifact.

## Operating Style

- Work in Russian by default for Centras CodeAI output.
- Prefer "many strong options -> ruthless shortlist -> first vertical slice".
- Separate facts from inferences and assumptions.
- Do not propose unrelated rewrites, new dependencies, or production integrations unless the idea requires them and the tradeoff is explicit.
- Treat beginners as capable but overloaded: reduce choices, show next action, and create quick wins.

## Workflow

1. Inspect the relevant project context before proposing changes: `AGENTS.md`, `src/types.ts`, `src/content/courseData.ts`, `src/components/CodeEditor.tsx`, `PracticeMissionRunner.tsx`, `PromptBuilder.tsx`, `SlideDeck.tsx`, `ResourceLibrary.tsx`, `TeacherDashboard.tsx`, and existing docs when applicable.
2. Restate the goal in one sentence and name the target user: student, teacher, admin, or course author.
3. Generate ideas across these buckets:
   - learning loop: slide, checkpoint, trainer, IDE mission, feedback, artifact;
   - student confidence: hints, examples, recovery, progress, language clarity;
   - teacher leverage: dashboard, live help, review, cohort controls, intervention queue;
   - AI workflow: prompt coach, diff review, agent simulation, rubric grading;
   - content density: weekly path, homework, resources, project milestones;
   - implementation: smallest vertical slice, data impact, security risk.
4. Score each serious idea by learner value, teacher value, implementation effort, risk, and whether it creates an artifact.
5. Shortlist 3-5 ideas and define the first buildable experiment for each.

## Output Shape

When producing a brainstorm, include:

- `Goal`: what the brainstorm optimizes.
- `Current Reality`: facts from the code or docs.
- `Idea Bank`: grouped ideas, not a flat dump.
- `Top Picks`: prioritized ideas with why now.
- `Vertical Slices`: smallest end-to-end implementation path.
- `Risks / No-Go`: what not to build yet.
- `Next Diff`: the first minimal code or content change if the user wants implementation.

## Quality Bar

An idea is not ready until it answers:

- What does the student do on screen?
- What artifact is produced?
- How does the system check progress?
- What can the AI coach say without becoming an unbounded chat?
- What does the teacher see?
- What is the smallest version that can ship without breaking the current architecture?
