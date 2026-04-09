# ReadWell V2 Implementation Plan

## Delivery Strategy

V2 should be delivered in slices that improve the live product early without forcing a full rewrite.
The safest sequence is:

1. document the target product clearly
2. ship browse and recommendation improvements first
3. add mastery and retry logic next
4. add placement once the progress model is stable

## Phase Breakdown

### Phase 0 - Documentation And Launch Framing

Deliverables:

1. v2 PRD
2. implementation plan
3. first engineering slice backlog

### Phase 1 - Browse By Learning Need

Outcome:
Learners can find stories by level, topic, grammar focus, and review need.

Backend work:

1. expose grammar rules in story summaries
2. expose enough story metadata for client-side filtering

Frontend work:

1. add search input to the library
2. add topic and grammar filters
3. add review-needed filter tied to existing progress signals
4. keep the current level filters intact

Why first:

1. low technical risk
2. immediate learner-facing value
3. aligns with the v2 goal of browse by learning need

### Phase 2 - Mastery States

Outcome:
The product stops treating all completed chapters as equally strong.

Backend work:

1. define chapter mastery states
2. store best quiz score, latest quiz score, and review freshness separately

Frontend work:

1. replace simple completion language with mastery state badges
2. surface state consistently in browse, story detail, and progress

### Phase 3 - Focused Retry Mode

Outcome:
Learners can retry only missed quiz items or weak grammar patterns.

Backend work:

1. expose retry subsets for a completed chapter
2. track retry attempts separately from full chapter attempts

Frontend work:

1. add retry entry points from completion and progress screens
2. build a compact retry flow

### Phase 4 - Placement Recommendation

Outcome:
New learners get a guided starting point.

Backend work:

1. store placement results per Firebase UID
2. define scoring and level recommendation rules

Frontend work:

1. add first-run placement flow
2. add recommendation summary and override option

### Phase 5 - Analytics

Outcome:
Launch decisions are based on real usage instead of guesswork.

Track:

1. onboarding started and completed
2. placement started and completed
3. chapter started and completed
4. quiz submitted
5. retry launched and completed
6. recommended next action clicked

## First Slice Backlog

The first coding slice for v2 is Browse By Learning Need.

### Backend

1. extend story summary DTO with `grammarRules`
2. build grammar rule summaries from chapter data

### Frontend

1. extend story model with `grammarRules`
2. add search text state
3. add grammar filter state
4. add topic filter state
5. add review-needed filter state
6. filter stories client-side using the new metadata and current progress signals

### Validation

1. verify story API still works without regressions
2. verify browse filtering works with no progress and with active progress
3. keep the current browse hero and progress guidance intact

## Delivery Rule

Each v2 slice should leave the current product shippable.
No slice should require unfinished later phases to feel coherent in the UI.