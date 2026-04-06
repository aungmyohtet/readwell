# Chapter Generation Prompt

Use this prompt with Claude or GPT-4o. Paste the filled spec JSON after the prompt.

---

## PROMPT

You are an expert English language learning content writer with the knowledge and craft of Cambridge English course book authors.

Your task is to write ONE chapter for a reading app aimed at learners of English. The chapter must match the spec provided.

---

### QUALITY STANDARDS — READ CAREFULLY

**Language level:**
- A2: Use only common, high-frequency words (approx. 1,500 word vocabulary). Short sentences (max 18 words). No complex subordination except the grammar target.
- B1: Allow intermediate vocabulary. Some complex sentences. Varied sentence length.
- B2: Rich, nuanced language. Sophisticated vocabulary. Varied syntax including subordination and literary devices.

**Grammar focus rule (CRITICAL):**
- The grammar target must appear NATURALLY in the story — it must feel like real language, not a grammar exercise.
- Every key structure listed in `grammarKeyStructures` must appear at least once in the story.
- Do NOT explain the grammar in the story. The story shows it; the grammarFocus section explains it.
- Do NOT use grammar structures from higher units in a jarring way if this is A2 or B1. Keep grammar mostly at or below the target level.

**Vocabulary rule (CRITICAL):**
- Every word in `targetWords` must:
  1. Appear at least once in the story content
  2. Appear in the vocabulary section with a clear definition and natural example sentence
  3. Be defined in plain language at or below the target level
- The emoji for each vocabulary item should semantically relate to the word.

**Story quality:**
- The story must have a clear emotional arc — the reader should feel something.
- Characters must feel real. Give them specific, small details (not just "she was happy").
- Use showing, not telling: instead of "Emma was nervous", write "Emma's hands felt cold. She kept reading the same line on her paper."
- Include natural dialogue (at least 2 exchanges for A2, 3+ for B1/B2).
- Paragraphs should be focused — one moment or beat per paragraph.
- The final paragraph should feel resolved or forward-looking, not just stopped.

**Comprehension questions:**
- `literal` questions: the answer is clearly stated in the story. Simple.
- `inferential` questions: the reader must think about what the text implies. At least one per chapter.
- `vocabulary_in_context` questions: ask what a specific word means in its context. Use the format: "What does the word [X] in paragraph [N] most likely mean?"
- All options (A/B/C/D) should be plausible. Wrong options must not be obviously silly.
- Explanations must refer back to the text: "The story says in paragraph 3 that..."

---

### OUTPUT FORMAT

Output ONLY valid JSON matching the structure below. No markdown fences, no extra text, no commentary.

```
{
  "story": {
    "title": "<parent story title>",
    "description": "<1-2 sentence summary of the whole story>",
    "level": "<A2|B1|B2>",
    "coverEmoji": "<one emoji>",
    "author": "ReadWell",
    "tags": ["<tag1>", "<tag2>", "<tag3>"]
  },
  "chapters": [
    {
      "chapterNumber": <int>,
      "title": "<chapter title>",
      "vocabulary": [
        {
          "word": "<target word>",
          "definition": "<plain-language definition at target level>",
          "exampleSentence": "<natural sentence using the word>",
          "emoji": "<relevant emoji>"
        }
      ],
      "grammarFocus": {
        "rule": "<grammar target name>",
        "explanation": "<clear, concise explanation at target level — 2-4 sentences max>",
        "examples": [
          "<sentence from or inspired by the story>",
          "<sentence from or inspired by the story>",
          "<sentence from or inspired by the story>",
          "<sentence from or inspired by the story>"
        ]
      },
      "content": [
        {
          "order": 1,
          "text": "<paragraph text>",
          "imagePlaceholder": "<emoji>"
        }
      ],
      "comprehension": [
        {
          "order": 1,
          "question": "<question text>",
          "options": ["<A>", "<B>", "<C>", "<D>"],
          "correctAnswer": "<exact text of correct option>",
          "explanation": "<why this is correct, with text reference>"
        }
      ]
    }
  ]
}
```

---

### SPEC

Paste the filled spec JSON here:

```json
{spec_json}
```

---

## NOTES FOR CONTENT CREATOR

Before submitting the prompt:
1. Fill in `spec_template.json` completely
2. Run `python content/validate.py --spec content/curriculum/my_spec.json` to check the spec
3. Paste the filled spec into the prompt above
4. Submit to Claude or GPT-4o
5. Save the output as `content/stories/<level>_<slug>.json`
6. Run `python content/validate.py content/stories/<level>_<slug>.json` to validate the output
7. Review manually — check story quality, grammar examples, question fairness
8. Run `python content/import.py content/stories/<level>_<slug>.json` to import

---

## TIPS FOR BETTER OUTPUT

- **Be specific in `storyTopic`**: "girl's first day at school" → "12-year-old girl forgets her homework on her second week at a new school and has to apologise to a strict teacher"
- **Emotional arc matters**: a flat arc ("she was happy then also happy") produces boring stories
- **Use `recycledVocabulary`**: if chapter 2, list words from chapter 1 to weave in
- **Request a specific scene**: e.g. "The story must include a moment where Emma nearly gives up but doesn't"
- **Iterate on grammar examples**: if the grammar examples feel mechanical, ask Claude to rewrite them to sound more like real dialogue or narration
