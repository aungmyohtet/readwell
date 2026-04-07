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

## What Is Implemented In This Slice

- Question-level mistake capture on quiz submission.
- Backend insights endpoint for review queue, weak grammar areas, and mistake bank.
- Dashboard UI for personalized review and error review.

## Success Metrics

- More learners revisit low-scoring chapters instead of abandoning them.
- Higher second-attempt quiz scores.
- Better retention of grammar patterns through targeted review.