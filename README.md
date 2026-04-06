# ReadWell — Grammar Reading App

A Cambridge-quality English grammar learning application built for learners aged 10–18. Students read graded stories designed around specific grammar targets and answer comprehension questions. Progress is tracked per user.

## Project Structure

```
grammar-app/
├── backend/          Java Spring Boot REST API
├── web/              Angular 19 frontend
├── README.md         This file
├── CLAUDE.md         AI assistant instructions
└── PLAN.md           Architecture and implementation plan
```

## Quick Start

### Prerequisites

- Java 21+
- Node.js 20+
- MongoDB running on `localhost:27017`
- Firebase project (for authentication)

### Backend

```bash
cd backend
export GOOGLE_APPLICATION_CREDENTIALS=path/to/firebase-adminsdk.json
./mvnw spring-boot:run
# Runs on http://localhost:8081
```

### Frontend

```bash
cd web
npm install
ng serve
# Runs on http://localhost:4201
```

### Import Content

```bash
cd backend
python content/import.py                  # import all story files
python content/import.py --clear          # clear and re-import
python content/validate.py content/stories/my_story.json  # validate before import
```

## Technology Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Java 21, Spring Boot 3.5, MongoDB |
| Frontend | Angular 19, Firebase JS SDK        |
| Auth     | Firebase Authentication (JWT)      |
| Database | MongoDB (local or Atlas)           |

## API Base URLs

| Environment | URL                    |
|-------------|------------------------|
| Local       | http://localhost:8081  |
| Frontend    | http://localhost:4201  |

## Key API Endpoints

| Method | Path                                  | Auth | Description                  |
|--------|---------------------------------------|------|------------------------------|
| GET    | `/health`                             | No   | Health check                 |
| GET    | `/api/stories`                        | Yes  | List stories (filter: level) |
| GET    | `/api/stories/{id}`                   | Yes  | Get story details            |
| GET    | `/api/stories/{storyId}/chapters`     | Yes  | List chapters for a story    |
| GET    | `/api/stories/chapters/{chapterId}`   | Yes  | Get chapter with content     |
| POST   | `/api/progress`                       | Yes  | Submit quiz result           |
| GET    | `/api/progress/history`               | Yes  | Get user progress history    |

## Content Levels

| Level | CEFR | Age     | Word Count / Chapter |
|-------|------|---------|----------------------|
| A2    | Elementary       | 10–13 | 250–380 words |
| B1    | Intermediate     | 13–16 | 400–560 words |
| B2    | Upper-Intermediate | 15–18 | 580–800 words |

## Stories in the Database

### A2
| Story                  | Chapters | Grammar Focus                              |
|------------------------|----------|--------------------------------------------|
| The New School         | 4        | Simple Past (Regular); Past Continuous; Irregular Past; Will/Going To |
| Morning in Maplewood   | 2        | Simple Present; Present Continuous          |
| The Saturday Market    | 2        | Comparatives & Superlatives; Modal Verbs    |

### B1
| Story                      | Chapters | Grammar Focus                                      |
|----------------------------|----------|----------------------------------------------------|
| Letters from Barcelona     | 4        | Present Perfect Simple; PP vs Simple Past; PP Continuous; Used To/Would |
| The Mountain Expedition    | 3        | Present Perfect vs Simple Past; Present Perfect Continuous; First Conditional |
| The Green Team             | 2        | First Conditional; Second Conditional               |

### B2
| Story                  | Chapters | Grammar Focus                                    |
|------------------------|----------|--------------------------------------------------|
| The Last Library       | 2        | Third Conditional; PP Continuous vs Simple        |
| The Bridge Year        | 2        | Mixed Conditionals; Passive All Tenses            |
