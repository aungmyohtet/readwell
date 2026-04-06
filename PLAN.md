# ReadWell — Architecture & Implementation Plan

## Overview

ReadWell is a graded English reading and grammar app. Students read short stories written to naturally demonstrate specific grammar targets, then answer vocabulary and comprehension questions. Progress is tracked per user.

The system is designed to be:
- **Deterministic** — no AI at runtime; all logic is rule-based
- **Read-heavy** — content is pre-generated and stored in MongoDB
- **Cost-efficient** — no vector databases, no embeddings, no LLM calls in production

---

## Architecture

```
[Angular Frontend]  →  Firebase Auth  →  ID Token
       ↓
[Spring Boot API :8081]
   FirebaseAuthFilter (verifies JWT)
       ↓
[MongoDB: grammar database]
   Collections: stories, chapters, user_progress
```

### Authentication Flow

1. User signs in via Firebase (email/password or Google) in the Angular app
2. Angular receives a Firebase ID token
3. Angular HTTP interceptor attaches `Authorization: Bearer <token>` to every request
4. Spring Boot `FirebaseAuthFilter` verifies the token against Firebase
5. Verified UID is set as the Spring Security principal
6. Controllers extract UID via `(String) auth.getPrincipal()`

---

## Backend Structure

```
backend/
├── src/main/java/com/grammar/backend/
│   ├── GrammarApplication.java
│   ├── config/
│   │   ├── FirebaseConfig.java          Firebase Admin SDK init
│   │   ├── FirebaseAuthFilter.java      JWT verification filter
│   │   └── SecurityConfig.java         Spring Security config
│   ├── model/
│   │   ├── Story.java                   Story document (title, level, tags)
│   │   ├── Chapter.java                 Chapter with vocabulary, grammar, content, comprehension
│   │   └── UserProgress.java            Per-user quiz results
│   ├── repository/
│   │   ├── StoryRepository.java
│   │   ├── ChapterRepository.java
│   │   └── UserProgressRepository.java
│   ├── service/
│   │   ├── StoryService.java
│   │   ├── ChapterService.java
│   │   └── ProgressService.java
│   ├── dto/                             Request/response DTOs
│   └── controller/
│       ├── HealthController.java        GET /health
│       ├── StoryController.java         Story and chapter endpoints
│       └── ProgressController.java      Progress submission and history
├── src/main/resources/
│   └── application.yml                  Port 8081, MongoDB config, CORS
└── content/
    ├── validate.py                      Content validator (run before import)
    ├── import.py                        MongoDB import script
    ├── curriculum/
    │   ├── curriculum.json              Full A2/B1/B2 grammar curriculum (36 units)
    │   └── spec_template.json           Chapter spec template
    ├── prompts/
    │   └── generate_chapter.md         LLM prompt for content generation
    └── stories/                         JSON story files (source of truth)
```

### Key Data Models

#### Story
```json
{
  "title": "Letters from Barcelona",
  "description": "...",
  "level": "B1",
  "coverEmoji": "✉️",
  "author": "ReadWell",
  "tags": ["travel", "coming-of-age"]
}
```

#### Chapter
```json
{
  "storyId": "...",
  "chapterNumber": 3,
  "title": "The Work Behind the Words",
  "vocabulary": [
    { "word": "commit", "definition": "...", "exampleSentence": "...", "emoji": "💪" }
  ],
  "grammarFocus": {
    "rule": "Present Perfect Continuous",
    "explanation": "...",
    "examples": ["..."]
  },
  "content": [
    { "order": 1, "text": "..." }
  ],
  "comprehension": [
    { "order": 1, "question": "...", "options": ["..."], "correctAnswer": "...", "explanation": "..." }
  ]
}
```

#### UserProgress
```json
{
  "userId": "<firebase-uid>",
  "storyId": "...",
  "chapterId": "...",
  "score": 4,
  "total": 5,
  "completedAt": "2026-04-06T..."
}
```

---

## Frontend Structure

```
web/
├── src/
│   ├── app/
│   │   ├── app.config.ts               Firebase init, HTTP client, router
│   │   ├── app.routes.ts               Lazy-loaded routes with authGuard
│   │   ├── core/
│   │   │   ├── guards/                 authGuard (redirects to /login if not signed in)
│   │   │   ├── interceptors/           auth.interceptor.ts (attaches Bearer token)
│   │   │   ├── models/                 TypeScript interfaces (Story, Chapter, etc.)
│   │   │   └── services/               auth.service.ts, story.service.ts, progress.service.ts
│   │   └── features/
│   │       ├── auth/                   login.component.ts (email + Google sign-in)
│   │       ├── browse/                 browse.component.ts (story cards, level filter)
│   │       ├── reader/                 reader.component.ts (4 tabs: Vocab/Grammar/Story/Quiz)
│   │       ├── progress/               progress.component.ts (history, scores)
│   │       └── profile/                profile.component.ts
│   └── environments/
│       └── environment.ts              Firebase config + API base URL
```

### Pages

| Route          | Component         | Auth | Description                              |
|----------------|-------------------|------|------------------------------------------|
| `/login`       | LoginComponent    | No   | Firebase email/password + Google sign-in |
| `/browse`      | BrowseComponent   | Yes  | Story cards with A2/B1/B2 filter         |
| `/story/:id`   | (via reader)      | Yes  | Chapter list with completion badges      |
| `/reader/:id`  | ReaderComponent   | Yes  | Vocab → Grammar → Story → Quiz tabs      |
| `/progress`    | ProgressComponent | Yes  | Quiz history with scores                 |
| `/profile`     | ProfileComponent  | Yes  | User info, sign-out                      |

---

## Content Pipeline

### Workflow

```
1. Pick grammar unit from curriculum.json
2. Fill spec_template.json (grammar target, vocab theme, target words, characters, setting)
3. Generate chapter using prompts/generate_chapter.md (with Claude or GPT-4o)
4. Validate: python content/validate.py content/stories/my_story.json
5. Fix any errors
6. Import: python content/import.py content/stories/my_story.json
```

### Content File Format

Story files live in `content/stories/`. Each file contains one story and one or more chapters. The import script is idempotent — re-running it updates existing documents rather than duplicating.

### Validator Checks (errors block import)

- `story.title`, `story.description`, `story.level`, `story.coverEmoji` present
- `chapter.vocabulary` has 4–6 items (A2) or 5–7 items (B1) or 6–8 items (B2)
- All vocabulary words appear in `chapter.content` text (substring check)
- Word count within level target range
- Paragraph count within level range
- `chapter.grammarFocus` has at least 4 examples
- `chapter.comprehension` has minimum required questions (3–5 A2, 4–6 B1, 5–7 B2)
- Each comprehension question has `question`, `options` (array), `correctAnswer` (full text string), `explanation`

---

## Curriculum Map Summary

### A2 (12 units) — audience age 10–13, 250–380 words/chapter

| Unit | Grammar Target                      |
|------|-------------------------------------|
| 1    | Simple Present                      |
| 2    | Simple Past – Regular               |
| 3    | Simple Past – Irregular             |
| 4    | Past Continuous                     |
| 5    | Present Continuous                  |
| 6    | Going To + Will                     |
| 7    | Comparatives & Superlatives         |
| 8    | Modal Verbs (can, could, should, must) |
| 9    | There is/are + Quantifiers          |
| 10   | Articles (a, an, the, zero)         |
| 11   | Question Forms                      |
| 12   | Countable & Uncountable Nouns       |

### B1 (12 units) — audience age 13–16, 400–560 words/chapter

| Unit | Grammar Target                      |
|------|-------------------------------------|
| 1    | Present Perfect Simple              |
| 2    | Present Perfect vs Simple Past      |
| 3    | Present Perfect Continuous          |
| 4    | Used To + Would (Past Habits)       |
| 5    | First Conditional                   |
| 6    | Second Conditional                  |
| 7    | Passive Voice (Present & Past)      |
| 8    | Reported Speech                     |
| 9    | Defining Relative Clauses           |
| 10   | Gerunds & Infinitives               |
| 11   | Modal Verbs – Deduction             |
| 12   | Time Clauses                        |

### B2 (12 units) — audience age 15–18, 580–800 words/chapter

| Unit | Grammar Target                      |
|------|-------------------------------------|
| 1    | Present Perfect Continuous vs Simple |
| 2    | Third Conditional                   |
| 3    | Mixed Conditionals                  |
| 4    | Passive Voice – All Tenses          |
| 5    | Reported Speech – Complex           |
| 6    | Non-Defining Relative Clauses       |
| 7    | Modal Perfect                       |
| 8    | Wish / If Only                      |
| 9    | Participle Clauses                  |
| 10   | Cleft Sentences & Inversion         |
| 11   | Advanced Connectors                 |
| 12   | Causative Have/Get + Nominalization |

---

## Stories Currently in the Database

### A2
| Story | Chapters | Grammar Units Covered |
|---|---|---|
| The New School | 4 | U2 Simple Past Reg; U4 Past Continuous; U3 Irregular Past; U6 Will/Going To |
| Morning in Maplewood | 2 | U1 Simple Present; U5 Present Continuous |
| The Saturday Market | 2 | U7 Comparatives; U8 Modals |

### B1
| Story | Chapters | Grammar Units Covered |
|---|---|---|
| Letters from Barcelona | 4 | U1 PP Simple; U2 PP vs Simple Past; U3 PP Continuous; U4 Used To/Would |
| The Mountain Expedition | 3 | U2 PP vs Simple Past; U3 PP Continuous; U5 First Conditional |
| The Green Team | 2 | U5 First Conditional; U6 Second Conditional |

### B2
| Story | Chapters | Grammar Units Covered |
|---|---|---|
| The Last Library | 2 | U2 Third Conditional; U1 PP Continuous vs Simple |
| The Bridge Year | 2 | U3 Mixed Conditionals; U4 Passive All Tenses |

---

## Remaining Content Gaps

### A2 (units still without stories)
- U9 There is/are + Quantifiers
- U10 Articles
- U11 Question Forms
- U12 Countable & Uncountable Nouns

### B1 (units still without stories)
- U7 Passive Voice
- U8 Reported Speech
- U9 Defining Relative Clauses
- U10 Gerunds & Infinitives
- U11 Modal Verbs – Deduction
- U12 Time Clauses

### B2 (units still without stories)
- U5 Reported Speech Complex
- U6 Non-Defining Relative Clauses
- U7 Modal Perfect
- U8 Wish / If Only
- U9 Participle Clauses
- U10 Cleft Sentences & Inversion
- U11 Advanced Connectors
- U12 Causative Have/Get + Nominalization

---

## Environment Variables

| Variable                        | Default                         | Description                    |
|---------------------------------|---------------------------------|--------------------------------|
| `MONGODB_URI`                   | `mongodb://localhost:27017`     | MongoDB connection string      |
| `MONGODB_DATABASE`              | `grammar`                       | Database name                  |
| `GOOGLE_APPLICATION_CREDENTIALS`| —                               | Path to Firebase Admin SDK JSON |
| `CORS_ALLOWED_ORIGINS`          | `http://localhost:4201`         | Frontend origin                |

---

## Next Steps

1. **Add content** for remaining curriculum units (A2 U9–12, B1 U7–12, B2 U5–12)
2. **Mobile app** — Flutter app consuming the same API (not yet started)
3. **Image support** — story paragraphs have `imageUrl` placeholder fields ready
4. **Audio support** — vocabulary items have `audioUrl` placeholder fields ready
5. **Streak tracking** — add daily reading streak to UserProgress
6. **Leaderboard** — optional, class-level or global
