---
name: vibe-learning-ux-designer
description: Design beginner-first UI/UX and instructional flows for Centras CodeAI: slide-to-practice journeys, Mission Workspace layouts, AI coach hints, prompt/IDE trainers, per-week resources, teacher live-help dashboards, onboarding simplification, homework review, and MVP learning milestones. Use when the user asks how the platform should look, guide attention, teach non-programmers, reduce navigation noise, or convert course content into interactive learning.
---

# Vibe Learning UX Designer

Use this skill to turn course material into a calm, guided learning interface. The goal is not decorative UI; the goal is comprehension, action, feedback, and teacher visibility.

## Inspect First

Read only the relevant files for the task:

- `AGENTS.md` for project constraints.
- `src/types.ts` for `Slide`, `PracticeTask`, `PracticeMission`, `ResourceLink`.
- `src/App.tsx` and `src/components/Navbar.tsx` for routes and navigation.
- `src/components/SlideDeck.tsx`, `PracticeMissionRunner.tsx`, `CodeEditor.tsx`, `PromptBuilder.tsx`, `Quiz.tsx`.
- `src/components/ResourceLibrary.tsx` and `TeacherDashboard.tsx` for resources and curator workflows.
- `src/lib/aiGateway.ts`, `grading.ts`, `consoleBridge.ts`, `sandboxStore.ts` for feedback, checks, deploys, and safety.

## Learning UX Principles

- One screen, one main action. Avoid asking beginners to choose between many equal options.
- Preserve a visible path: "where am I, what do I do, how do I check, what happens next".
- Convert every concept into a micro-action within 1-3 minutes.
- Keep help progressive: hint 1 explains, hint 2 points, hint 3 gives near-solution for review.
- Prefer guided missions over long instructions.
- Show concrete artifacts: prompt, fixed diff, snapshot, deploy link, rubric score, teacher comment.
- Use existing CSS variables and component patterns; do not add dependencies for layout-only work.

## Target Student Flow

Design around this loop:

```text
slide concept
-> tiny checkpoint
-> guided trainer
-> IDE or prompt mission
-> deterministic checks
-> AI coach feedback
-> artifact saved
-> free sandbox continuation
```

For each screen, specify:

- primary action;
- secondary action;
- disabled/empty/loading/error states;
- teacher-visible event;
- saved artifact;
- acceptance criteria.

## Mission Workspace Pattern

Use a three-zone layout for desktop:

- Left rail: week goal, current step, hint ladder, success criteria, resources for this step.
- Center: editor, prompt box, diff viewer, or trainer canvas.
- Right rail: Live Preview, AI Coach, checks, teacher help status.

On mobile, make slides, quizzes, resources, and prompt labs usable; mark IDE missions as desktop-first when needed.

## AI Coach Rules

- Never design an unbounded "ask anything" chat as the first version.
- Tie every AI reply to `weekId`, `missionId`, `stepId`, visible code/prompt, and rubric.
- Offer modes: `Explain`, `Hint`, `Review prompt`, `Review diff`, `Recover from error`.
- Keep answers short and actionable; always end with the next on-screen action.
- Do not let client-side AI verdicts self-approve submissions in production.

## Teacher UX Rules

Teacher tools should answer:

- Who is stuck right now?
- On which week/mission/step/check?
- What did they try?
- Which hint level did they reach?
- What artifact or deploy can I open?
- Can I leave a comment, request a retry, or join a help session?

Live help can start as a lightweight "request help + teacher sees current files + comment" workflow before real collaborative editing.

## Output Shape

When producing UI/UX specs, include:

- Objective and audience.
- Current-state findings from code.
- Target journey.
- Screen-by-screen layout.
- Button/control inventory.
- Learning interactions and checkpoints.
- AI coach behavior.
- Teacher workflow.
- Data/type impact.
- Implementation phases.
- Verification checklist.
