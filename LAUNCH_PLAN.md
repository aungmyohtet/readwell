# Launch Plan

## Product Goal

Ship a grammar-reading app that feels materially better than a static worksheet library.
The launch product should help learners read, notice grammar in context, retrieve meaning, and review mistakes intelligently.

Current launch gate: content quality and curriculum completeness. See `CONTENT_LAUNCH_PLAN.md` for the publishing plan and go/no-go criteria.
Selected scope: full A2-B2 launch readiness, not a narrower staged content launch.

## Standout Launch Features

### Phase 1 — Launch Core

1. Personalized review queue
   - Recommend chapters to revisit when quiz performance is weak.
   - Surface the grammar rule that needs review.

2. Mistake bank
   - Store wrong quiz answers with the learner's selected answer, the correct answer, and the explanation.
   - Make review part of the normal study loop instead of hiding it after quiz submission.

3. Progress insights
   - Show average score, weak grammar areas, and recent mistakes in a compact dashboard.

### Phase 2 — Adaptive Guidance

1. Recommended next chapter based on performance and recent study history.
2. Rule-level mastery tracking by grammar target.
3. Smarter retry flow that prioritizes recent weak areas.

### Phase 3 — Premium Differentiators

1. Placement test and starting-level recommendation.
2. Read-aloud audio with sentence follow mode.
3. Teacher and parent dashboards.

## Execution Order

1. Build the progress-data foundation.
2. Expose learner insights from the backend.
3. Upgrade the learner dashboard with review recommendations.
4. Expand into adaptive study sequencing.

## Incremental Grammar Strengthening Track

The product already teaches grammar through story context and review. The next improvement should be incremental: strengthen explicit teaching first, then add controlled practice, then track grammar mastery separately from chapter completion.

### Step 1 — Make Grammar Explanations Teach Better

Goal: make the grammar tab feel like a short lesson instead of a single note.

Scope:
- Expand each chapter's grammar content from a single explanation paragraph into a more structured teaching block.
- Keep this step content-first so it improves pedagogy without requiring a large backend or UI rewrite.

Target additions:
- `formGuide` — how the structure is built
- `usageNotes` — when learners use it
- `contrastWith` — nearby form learners confuse it with
- `commonMistakes` — 1-3 likely errors

Why first:
- Lowest implementation risk
- Immediate learner-facing benefit
- Creates the foundation for better practice items later

### Step 2 — Add Dedicated Grammar Practice Data

Goal: stop relying on comprehension questions to carry grammar practice.

Scope:
- Add a `grammarPractice` array to chapter content.
- Start with a narrow set of task types that are easy to author and validate.

Initial practice types:
- multiple choice
- fill in the blank
- error correction
- sentence transformation

Minimum launch target per chapter:
- 4-6 grammar practice items for A2
- 5-7 for B1
- 5-8 for B2

### Step 3 — Add A Practice Stage In The Reader

Goal: give learners a controlled-practice step between noticing and full quiz retrieval.

Scope:
- Add a `Practice` tab to the reader flow.
- Keep the current reading and quiz experience intact.

New lesson loop:
- Vocabulary
- Grammar
- Story
- Practice
- Quiz

### Step 4 — Split Story Understanding From Grammar Control

Goal: make feedback clearer by separating comprehension performance from grammar performance.

Scope:
- Keep comprehension questions as story understanding checks.
- Score grammar practice separately.
- Use grammar errors to drive future review suggestions.

### Step 5 — Track Rule-Level Mastery

Goal: make the app feel grammar-led, not just chapter-led.

Scope:
- Store mastery by grammar target.
- Surface weak grammar targets in the dashboard.
- Recommend review based on grammar pattern weakness, not only chapter score.

### Step 6 — Harden Grammar Highlighting Quality

Goal: make grammar highlighting accurate enough to support teaching, not just decoration.

Scope:
- Audit each rule for false positives and false negatives in the grammar tab and story highlight mode.
- Replace broad regex-only matching where needed with more semantic or annotation-driven highlighting.
- Treat highlighting quality as a launch requirement because misleading highlights weaken trust in the lesson.

Priority issues:
- simple past false positives such as standalone nouns ending in `ed`
- passive and participle over-highlighting
- question and auxiliary rules that may highlight the wrong token in longer sentences

Execution rule:
- fix highlighting issues one by one, starting with the rules most visible in A2
- prefer explicit annotations or token-aware rules over blanket suffix matching
- add a regression example for each highlighting bug that gets fixed

## Recommended Next Slice

Start with Step 1.

Deliverables for the next implementation slice:
- Extend the content schema for richer grammar explanation fields.
- Update backend DTOs and import/validation logic.
- Update the reader grammar tab to render the richer teaching structure.
- Upgrade 1-2 existing story files as exemplars before converting the whole library.

Success signal:
- A learner can open the grammar tab and clearly answer three questions: how to form it, when to use it, and what mistake to avoid.

## What Is Implemented In This Slice

- Question-level mistake capture on quiz submission.
- Backend insights endpoint for review queue, weak grammar areas, and mistake bank.
- Dashboard UI for personalized review and error review.

## Success Metrics

- More learners revisit low-scoring chapters instead of abandoning them.
- Higher second-attempt quiz scores.
- Better retention of grammar patterns through targeted review.
- Fewer false grammar highlights in lesson examples and highlighted story text.