## Architecture
- **Stack**: React 19, Vite, TypeScript, Vanilla CSS, Monaco Editor (`@monaco-editor/react`), Supabase (`@supabase/supabase-js`), Lucide React.
- **Data Layer**: Supabase Relational Database. Dynamic local localStorage emulation fallback (Mock Mode) when credentials are empty.
- **Edge Proxy**: Supabase Edge Functions proxying requests to Gemini API (models/gemini-1.5-flash) using secret API keys.
- **Theme Support**: Dark/Light mode utilizing CSS Variables with `data-theme` selectors.
- **Routing**: Lightweight React state-based router with login gates and teacher authority checks.

## Module Registry
| Module | Path | Responsibility | Depends on | Depended on by |
|--------|------|----------------|------------|----------------|
| Types | `src/types.ts` | TypeScript interfaces for modules, slides, practice and quizzes | None | `App.tsx`, `courseData.ts`, components |
| Database Connection | `src/supabaseClient.ts` | Supabase SDK client with a highly complete localStorage mock database manager | None | `App.tsx`, `Auth.tsx`, `CodeEditor.tsx`, `TeacherDashboard.tsx` |
| Auth Screen | `src/components/Auth.tsx` | Login and signup panels supporting quick demo profiles | `supabaseClient.ts` | `App.tsx` |
| Sandbox Editor | `src/components/CodeEditor.tsx` | Monaco Editor code workspace with Live HTML/CSS/JS preview iframe | `supabaseClient.ts` | `App.tsx` |
| Teacher Panel | `src/components/TeacherDashboard.tsx` | Instructor panel to change cohort active week and audit submissions | `supabaseClient.ts` | `App.tsx` |
| Main App | `src/App.tsx` | Core app shell, route coordinator, auth guards and locked week screens | Components | `main.tsx` |

## Decisions Log
| # | Date | Decision | Context | Alternatives rejected | Reversal cost |
|---|------|----------|---------|-----------------------|---------------|
| 1 | 2026-06-08 | Vanilla CSS | Custom premium "engineering laboratory" styles | Tailwind CSS (rejected due to USER global rules and design freedom) | Medium |
| 2 | 2026-06-08 | Monaco Editor | Professional IDE sandbox for students | Sandpack (rejected to have full control of compiling and minimize weight) | Medium |
| 3 | 2026-06-08 | Supabase + Mock | Auth database with offline mode | MongoDB / Node.js Backend (rejected to avoid writing complex server codes) | Medium |
| 4 | 2026-06-08 | Server Edge Proxy | Hiding Gemini API key on Deno server | Direct client-side Gemini requests (rejected for security key protection) | Low |
| 5 | 2026-06-09 | Split Practice UI (PromptBuilder / CodeEditor) | Rendering PromptBuilder for Block 1 (No-Code) and CodeEditor for Block 2 (IDE) | Single unified editor (rejected because writing prompts and writing JS code are structurally different tasks) | Low |
| 6 | 2026-06-09 | Support slide images and visual diagrams | Add optional imageUrl and imageCaption fields to Slide model | Heavy third-party slide rendering libraries (rejected to maintain Zero-Scroll layout and light footprint) | Low |

## Task Log
| # | Task | Mode | Status | Files | Goals satisfied (G1–G4) | Notes |
|---|------|------|--------|-------|-------------------------|-------|
| 1 | Create Centras CodeAI course platform | Feature | Completed | All src files | G1, G2, G3, G4 | Platform built, linted and compiled successfully |
| 2 | Add Monaco IDE, Auth and Gemini grading | Feature | Completed | All new components & SQL | G1, G2, G3, G4 | Integrated Supabase Client, Monaco, SQL migrations, Edge Function and Teacher views |
| 3 | TS strict-mode and ESLint remediation | Fix | Completed | `App.tsx`, `CodeEditor.tsx`, `TeacherDashboard.tsx`, `Auth.tsx`, `Navbar.tsx`, `supabaseClient.ts`, `types.ts` | G3, G4 | Eliminated 43 ESLint errors, implemented typed interfaces, safely structured lifecycles without redundant effects |
| 4 | Enrich curriculum with vibe-coding best practices | Feature | Completed | `courseData.ts` | G1, G3 | Added 8 slides, advanced practices (context hygiene, subagents, MCP safety, Git diff, infinite edit loop breaking), improved quizzes and DoDs |
| 5 | Create default Admin user for platform | Feature | Completed | `src/types.ts`, `src/supabaseClient.ts`, `src/components/Auth.tsx`, `src/components/Navbar.tsx`, `src/App.tsx` | G1, G2, G4 | Added admin role, seeded `admin`/`admin12345` mock user, granted admin access to Teacher dashboard |
| 6 | Curriculum Expansion & Practice Routing | Feature | Completed | `src/content/courseData.ts`, `src/App.tsx`, `src/components/Navbar.tsx` | G1, G2, G3 | Expanded curriculum to 10 detailed modules, split practice UI based on type, updated week count in navbar |
| 7 | Add generated AI illustrations & memes to curriculum slides | Feature | Completed | `src/types.ts`, `src/components/SlideDeck.tsx`, `src/components/SlideDeck.css`, `src/content/courseData.ts` | G1, G3 | Generated premium diagrams for vibe coding concept, prompt blueprint, and loop breaker, integrated them in slides and styled with glassmorphism CSS |

## Known Issues & Technical Debt
| Issue | Severity | Location | Impact on G1 / G3 / G4 | Owner | Plan |
|-------|----------|----------|------------------------|-------|------|
| Iframe sandbox limits | Low | `src/components/CodeEditor.tsx` | Sandbox iframe is restricted to script-execution; local resources blocked | Antigravity | Standard web security. Intended behavior. |

## Build & Test Commands
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Dev**: `npm run dev`
- **Preview**: `npm run preview`
