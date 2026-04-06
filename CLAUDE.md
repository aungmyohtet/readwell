# CLAUDE.md — ReadWell Grammar App

Instructions for Claude Code (and other AI assistants) working on this project.

---

## Project Summary

**ReadWell** is a graded English reading and grammar app for learners aged 10–18.

- Students read short stories written around specific grammar targets (Cambridge CEFR A2/B1/B2)
- Stories include vocabulary items, a grammar focus panel, story paragraphs, and comprehension questions
- Progress is tracked per Firebase user

This is a **content-driven, deterministic system**. No AI at runtime. AI is only used offline to generate content JSON files, which are then validated and imported into MongoDB.

---

## Repository Layout

```
grammar-app/
├── backend/     Java 21 + Spring Boot 3.5 REST API (port 8081)
├── web/         Angular 19 frontend (port 4201)
├── README.md    Quick-start guide
├── PLAN.md      Full architecture, data models, curriculum map, content gaps
└── CLAUDE.md    This file
```

---

## Working Rules

### 1. Never touch `web/node_modules/` or `backend/target/`
These are build artefacts. Don't read, edit, or create files there.

### 2. Backend runs on port 8081, frontend on port 4201
Don't change these unless explicitly asked. The CORS config in `application.yml` allows `http://localhost:4201`.

### 3. Authentication is Firebase-only
There is no separate User collection. Users are identified by their Firebase UID everywhere. Don't add a users table or custom auth.

### 4. No AI at runtime
Never introduce LLM calls, embeddings, or vector search into the application code. AI is only used to generate content JSON files offline.

### 5. Content files are the source of truth
Story JSON lives in `backend/content/stories/`. The database is populated from these files. Always validate before importing:
```bash
python backend/content/validate.py backend/content/stories/my_story.json
python backend/content/import.py backend/content/stories/my_story.json
```

### 6. Restart `ng serve` after frontend changes on Windows
Hot-reload is unreliable on Windows. Always restart the dev server after code changes.

---

## Content JSON Schema

Every story file must follow this exact structure for the validator and importer to work.

### Top-level
```json
{
  "story": { "title", "description", "level", "coverEmoji", "author", "tags" },
  "chapters": [ ... ]
}
```

### Chapter
```json
{
  "chapterNumber": 1,
  "title": "...",
  "vocabulary": [
    { "word": "...", "definition": "...", "exampleSentence": "...", "emoji": "..." }
  ],
  "grammarFocus": {
    "rule": "...",
    "explanation": "...",
    "examples": ["...", "...", "...", "..."]
  },
  "content": [
    { "order": 1, "text": "..." }
  ],
  "comprehension": [
    {
      "order": 1,
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B",
      "explanation": "..."
    }
  ]
}
```

**Critical:** `correctAnswer` must be the **full text string** of the correct option, not an index number.

### Level Targets

| Level | Words/Chapter | Paragraphs | Vocab Items | Questions |
|-------|--------------|------------|-------------|-----------|
| A2    | 250–380      | 4–6        | 4–6         | 3–5       |
| B1    | 400–560      | 5–7        | 5–7         | 4–6       |
| B2    | 580–800      | 6–9        | 6–8         | 5–7       |

---

## Technology Stack

### Backend
- Java 21, Spring Boot 3.5, Spring Data MongoDB, Spring Security
- Firebase Admin SDK for JWT verification
- Maven (`./mvnw spring-boot:run`)
- `GOOGLE_APPLICATION_CREDENTIALS` env var must point to the Firebase Admin SDK JSON

### Frontend
- Angular 19 (standalone components, no NgModules)
- Firebase JS SDK for client-side auth
- Angular HTTP interceptor attaches `Bearer` token automatically
- Lazy-loaded routes; `authGuard` protects all non-login pages

---

## Starting the App

### Backend
```bash
cd backend
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-adminsdk.json
./mvnw spring-boot:run
```

### Frontend
```bash
cd web
npm install   # first time only
ng serve
```

### MongoDB
Must be running locally on `mongodb://localhost:27017`, database `grammar`. Or set `MONGODB_URI` env var.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/main/resources/application.yml` | Port, MongoDB URI, CORS config |
| `backend/content/validate.py` | Validates content JSON before import |
| `backend/content/import.py` | Imports/updates stories in MongoDB |
| `backend/content/curriculum/curriculum.json` | Full 36-unit grammar curriculum |
| `backend/content/curriculum/spec_template.json` | Template for planning a chapter |
| `backend/content/prompts/generate_chapter.md` | LLM prompt for content generation |
| `web/src/environments/environment.ts` | Firebase config + API base URL |

---

## Content Generation (Offline)

To add new stories:

1. Pick the next unused grammar unit from `backend/content/curriculum/curriculum.json`
2. Fill in `spec_template.json` (grammar target, vocab theme, target words, characters, setting)
3. Generate the chapter JSON using `backend/content/prompts/generate_chapter.md` with Claude or GPT-4o
4. Validate: `python backend/content/validate.py backend/content/stories/new_story.json`
5. Fix any errors (word count too low, vocab words not in text, wrong comprehension format)
6. Import: `python backend/content/import.py backend/content/stories/new_story.json`

Content gaps (units without stories yet) are listed in `PLAN.md`.

---

## Session Summary (as of 2026-04-06)

This summarises all work done so far, for AI assistants picking up mid-project.

### What was built (from scratch, across multiple sessions)

**Session 1–2: Backend scaffolding**
- Spring Boot project with Firebase JWT auth filter
- MongoDB collections: `stories`, `chapters`, `user_progress`
- REST endpoints: story listing/detail, chapter fetching, progress submit/history
- CORS configured for `http://localhost:4201`

**Session 3: Angular frontend**
- Firebase email/password + Google sign-in
- Browse page with story cards and level filter (A2/B1/B2)
- Reader page with 4 tabs: Vocabulary → Grammar Focus → Story → Quiz
- Progress page with history and scores
- Auth interceptor and `authGuard`

**Session 4: Content tooling**
- `content/curriculum/curriculum.json` — full 36-unit A2/B1/B2 grammar curriculum
- `content/validate.py` — content validator (errors block import, warnings don't)
- `content/import.py` — idempotent MongoDB importer
- `content/prompts/generate_chapter.md` — Cambridge-quality generation prompt

**Sessions 5–6: Content generation**
- Generated and imported 9 stories / 21 chapters covering A2 Units 1–8 and B1 Units 1–6 and B2 Units 1–4

### Stories in the database (2026-04-06)

#### A2
- **The New School** (4 ch): Simple Past Reg → Past Continuous → Irregular Past → Will/Going To
- **Morning in Maplewood** (2 ch): Simple Present → Present Continuous
- **The Saturday Market** (2 ch): Comparatives → Modal Verbs

#### B1
- **Letters from Barcelona** (4 ch): PP Simple → PP vs Simple Past → PP Continuous → Used To/Would
- **The Mountain Expedition** (3 ch): PP vs Simple Past → PP Continuous → First Conditional
- **The Green Team** (2 ch): First Conditional → Second Conditional

#### B2
- **The Last Library** (2 ch): Third Conditional → PP Continuous vs Simple
- **The Bridge Year** (2 ch): Mixed Conditionals → Passive All Tenses

### Content source files
All stories live as JSON files in `backend/content/stories/`. Each file has all chapters for that story. The database was populated using `import.py`. Files are the source of truth — if you need to update a story, edit the JSON file and re-run the importer.

### Known issues / notes
- The Angular dev server hot-reload is unreliable on Windows — always restart `ng serve` after changes
- `correctAnswer` in comprehension questions must be the **full text string** of the correct option (not an index). The import script does not validate this — check manually.
- `content/stories/a2_the_new_school_ch3_ch4.json` is a separate file for chapters 3 and 4. The importer merges them into the same story by matching on title.
- `content/stories/b1_letters_from_barcelona_ch3_ch4.json` — same pattern, chapters 3–4 are in a separate file
