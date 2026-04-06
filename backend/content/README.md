# Content Management

## Adding New Stories

1. Create a JSON file in `content/stories/` following the structure below.
2. Run the import script to load it into MongoDB.

## JSON Structure

```json
{
  "story": {
    "title": "Story Title",
    "description": "Short description",
    "level": "A2",
    "coverEmoji": "🏫",
    "author": "Author Name",
    "tags": ["school", "friendship"]
  },
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "vocabulary": [
        {
          "word": "word",
          "definition": "meaning",
          "exampleSentence": "Used in a sentence.",
          "emoji": "😊"
        }
      ],
      "grammarFocus": {
        "rule": "Grammar Rule Name",
        "explanation": "Explanation of the rule.",
        "examples": ["Example 1.", "Example 2."]
      },
      "content": [
        {
          "order": 1,
          "text": "Paragraph text here.",
          "imagePlaceholder": "🌅",
          "imageUrl": null
        }
      ],
      "comprehension": [
        {
          "order": 1,
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Why this is the correct answer."
        }
      ]
    }
  ]
}
```

## Levels
- `A2` — Elementary
- `B1` — Intermediate
- `B2` — Upper Intermediate

## Content Status

```bash
# Show curriculum coverage table (all levels)
python content/status.py

# Show only missing units
python content/status.py --missing

# Filter by level
python content/status.py --missing --level B1
```

## Import Script

```bash
# Install dependency
pip install pymongo

# Validate AND import in one step (recommended)
python content/import.py --validate stories/my_story.json

# Import all stories (no validation)
python content/import.py

# Import a single story
python content/import.py stories/my_story.json

# Clear and re-import all
python content/import.py --clear
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `grammar` | Database name |

## Adding Images Later

When you have images for a chapter paragraph, set the `imageUrl` field in the JSON content.  
The `imagePlaceholder` emoji will be shown when `imageUrl` is null or not set.

## Audio (Future)

Each paragraph and vocabulary item can have an `audioUrl` field added later.  
The frontend will show an audio play button when that field is present.
