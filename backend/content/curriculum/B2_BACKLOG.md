# B2 Production Backlog

This backlog converts the B2 launch requirement into concrete production work.
Current B2 coverage exists for Units 1 to 4 only.
Units 5 to 12 must be written, validated, imported, and reviewed before launch.

## Existing B2 Baseline

Already present in stories:
- Unit 1: Present Perfect Continuous vs Simple
- Unit 2: Third Conditional
- Unit 3: Mixed Conditionals
- Unit 4: Passive Voice - All Tenses

Current reference files:
- `backend/content/stories/b2_the_last_library.json`
- `backend/content/stories/b2_the_last_library_ch2.json`
- `backend/content/stories/b2_the_bridge_year.json`

## Production Principles

- Keep B2 stories emotionally grounded, not essay-like.
- Make grammar visible through real conflict, decisions, memory, and consequence.
- Recycle vocabulary across nearby chapters where possible.
- Prefer two-chapter story arcs so the level feels like a curated graded-reader set rather than isolated drills.
- Validate spec first, then generate, then validate story JSON, then import.

## All Units — Completed (2026-04-07)

| Priority | Unit | Grammar | Vocab Theme | Story | Status |
|---|---:|---|---|---|---|
| 1 | 5 | Reported Speech - Complex | social_issues_and_debate | The Public Square Ch1 | ✓ imported |
| 2 | 7 | Modal Perfect | ethics_and_responsibility | Fault Line Ch1 | ✓ imported |
| 3 | 8 | Wish / If Only | relationships_and_emotions | Fault Line Ch2 | ✓ imported |
| 4 | 11 | Advanced Connectors and Discourse Markers | global_challenges | The Public Square Ch2 | ✓ imported |
| 5 | 6 | Non-Defining Relative Clauses | culture_and_identity | Borrowed Names Ch1 | ✓ imported |
| 6 | 9 | Participle Clauses | adventure_and_challenge | Pressure Lines Ch1 | ✓ imported |
| 7 | 10 | Emphasis - Cleft Sentences and Inversion | arts_and_expression | Borrowed Names Ch2 | ✓ imported |
| 8 | 12 | Causative Have/Get + Nominalization | systems_and_institutions | Pressure Lines Ch2 | ✓ imported |

## Proposed Story Bundles

### Story A - public pressure and public truth

- Chapter 1: Unit 5, Reported Speech - Complex
- Chapter 2: Unit 11, Advanced Connectors and Discourse Markers
- Premise: a student journalist investigates a city redevelopment dispute and learns how quoted claims, leaked statements, and public narratives shape what people believe.

### Story B - blame, regret, and responsibility

- Chapter 1: Unit 7, Modal Perfect
- Chapter 2: Unit 8, Wish / If Only
- Premise: after a preventable incident in a youth leadership programme, two close friends try to understand what happened, what should have been done, and what can still be repaired.

### Story C - heritage and self-definition

- Chapter 1: Unit 6, Non-Defining Relative Clauses
- Chapter 2: Unit 10, Emphasis - Cleft Sentences and Inversion
- Premise: a sixth-form student curates a cultural exhibition about her grandmother, whose migration story changes how she sees identity, performance, and voice.

### Story D - pressure systems

- Chapter 1: Unit 9, Participle Clauses
- Chapter 2: Unit 12, Causative Have/Get + Nominalization
- Premise: a demanding field expedition is followed by an institutional inquiry, linking physical endurance with formal systems, responsibility, and control.

## Immediate Work Queue

### Now

- Generate Unit 5 from `backend/content/curriculum/specs/b2_unit_5_reported_speech_complex.json`
- Validate the generated story JSON
- Review manually for dialogue quality, reporting-verb variety, and natural political/social tension

### Next

- Generate Unit 11 from `backend/content/curriculum/specs/b2_unit_11_advanced_connectors.json`
- Generate Unit 7 from `backend/content/curriculum/specs/b2_unit_7_modal_perfect.json`
- Generate Unit 8 from `backend/content/curriculum/specs/b2_unit_8_wish_if_only.json`
- Generate Unit 6 from `backend/content/curriculum/specs/b2_unit_6_non_defining_relative_clauses.json`
- Generate Unit 10 from `backend/content/curriculum/specs/b2_unit_10_cleft_sentences_inversion.json`

### Story A status

- Chapter 1 spec ready: Unit 5, `b2_unit_5_reported_speech_complex.json`
- Chapter 2 spec ready: Unit 11, `b2_unit_11_advanced_connectors.json`
- Story A is now fully scaffolded for generation

### Story B status

- Chapter 1 spec ready: Unit 7, `b2_unit_7_modal_perfect.json`
- Chapter 2 spec ready: Unit 8, `b2_unit_8_wish_if_only.json`
- Story B is now fully scaffolded for generation

### Story C status

- Chapter 1 spec ready: Unit 6, `b2_unit_6_non_defining_relative_clauses.json`
- Chapter 2 spec ready: Unit 10, `b2_unit_10_cleft_sentences_inversion.json`
- Story C is now fully scaffolded for generation

### Story D status

- Chapter 1 spec ready: Unit 9, `b2_unit_9_participle_clauses.json`
- Chapter 2 spec ready: Unit 12, `b2_unit_12_causative_nominalization.json`
- Story D is now fully scaffolded for generation

## Editorial Watchpoints For B2

- Avoid textbook-sounding over-signalling such as repeated grammar prompts in narration.
- Use sophisticated but still teachable vocabulary.
- Keep inferential questions genuinely inferential.
- Make annotation spans selective and exact.
- Keep social-issue themes nuanced rather than slogan-driven.

## Done Definition Per Unit

1. Spec file exists and passes `python backend/content/validate.py --spec ...`
2. Generated story JSON passes `python backend/content/validate.py ...`
3. Manual editorial review completed
4. Story imported successfully
5. Coverage status updated in launch docs