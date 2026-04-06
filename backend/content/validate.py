#!/usr/bin/env python3
"""
Content Validation Script for ReadWell

Validates generated chapter JSON files against curriculum rules and quality standards.

Usage:
    python content/validate.py content/stories/a2_the_new_school.json
    python content/validate.py content/stories/          # validate all files in directory
    python content/validate.py --spec content/curriculum/my_spec.json  # validate a spec file

Exit codes:
    0 = all checks passed (warnings may still be printed)
    1 = one or more errors found
"""

import json
import re
import sys
from pathlib import Path

CURRICULUM_PATH = Path(__file__).parent / "curriculum" / "curriculum.json"

# ─────────────────────────────────────────────
# Colour output
# ─────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):    print(f"  {GREEN}[OK]{RESET}  {msg}")
def warn(msg):  print(f"  {YELLOW}[WARN]{RESET}  {msg}")
def error(msg): print(f"  {RED}[ERR]{RESET}  {msg}")


# ─────────────────────────────────────────────
# Load curriculum
# ─────────────────────────────────────────────
def load_curriculum():
    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────
# Spec validation
# ─────────────────────────────────────────────
def validate_spec(spec_path: Path) -> bool:
    print(f"\n{BOLD}Validating spec: {spec_path.name}{RESET}")
    curriculum = load_curriculum()
    errors = 0

    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)

    # Remove _comment and _instructions fields for cleaner validation
    spec = {k: v for k, v in spec.items() if not k.startswith("_")}

    required_fields = [
        "storyTitle", "level", "curriculumUnit", "grammarTarget",
        "grammarKeyStructures", "chapterNumber", "chapterTitle",
        "storyTopic", "setting", "mainCharacters", "vocabularyTheme",
        "targetWords", "comprehensionQuestionTypes", "toneAndStyle", "emotionalArc"
    ]

    for field in required_fields:
        if field not in spec or not spec[field]:
            error(f"Missing required field: {field}")
            errors += 1
        else:
            ok(f"{field}: present")

    # Level check
    level = spec.get("level")
    if level and level not in curriculum["levels"]:
        error(f"level '{level}' is not valid. Must be: A2, B1, B2")
        errors += 1

    # Target words count
    level_config = curriculum["levels"].get(level, {})
    target_words = spec.get("targetWords", [])
    vocab_range = level_config.get("vocabularyItemsPerChapter", {"min": 4, "max": 8})
    if len(target_words) < vocab_range["min"]:
        warn(f"targetWords has {len(target_words)} words — recommended minimum is {vocab_range['min']} for {level}")
    elif len(target_words) > vocab_range["max"]:
        warn(f"targetWords has {len(target_words)} words — recommended maximum is {vocab_range['max']} for {level}")
    else:
        ok(f"targetWords count: {len(target_words)} (within {vocab_range['min']}–{vocab_range['max']})")

    # Question types
    q_types = spec.get("comprehensionQuestionTypes", [])
    if "inferential" not in q_types:
        warn("No 'inferential' question type in comprehensionQuestionTypes — at least one is strongly recommended")
    else:
        ok("Includes at least one inferential question")

    # Curriculum unit check
    unit = spec.get("curriculumUnit")
    grammar_target = spec.get("grammarTarget")
    if level and unit and grammar_target:
        units = {u["unit"]: u for u in curriculum["levels"][level]["grammarUnits"]}
        if unit in units:
            expected = units[unit]["grammar"]
            if grammar_target != expected:
                warn(f"grammarTarget '{grammar_target}' doesn't match curriculum unit {unit}: '{expected}'")
            else:
                ok(f"grammarTarget matches curriculum unit {unit}")
        else:
            warn(f"Unit {unit} not found in curriculum for level {level}")

    # Emotional arc not empty
    arc = spec.get("emotionalArc", "")
    if len(arc) < 10:
        warn("emotionalArc is very short — a meaningful arc improves story quality significantly")

    print()
    if errors:
        print(f"{RED}Spec has {errors} error(s). Fix before generating.{RESET}")
        return False
    else:
        print(f"{GREEN}Spec looks good. Ready to generate.{RESET}")
        return True


# ─────────────────────────────────────────────
# Story/chapter validation
# ─────────────────────────────────────────────
def validate_story(file_path: Path) -> bool:
    print(f"\n{BOLD}Validating: {file_path.name}{RESET}")
    curriculum = load_curriculum()
    errors = 0
    warnings = 0

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # ── Story section ──
    story = data.get("story")
    if not story:
        error("Missing 'story' section")
        return False

    story_fields = ["title", "description", "level", "coverEmoji"]
    for f in story_fields:
        if not story.get(f):
            error(f"story.{f} is missing or empty")
            errors += 1
        else:
            ok(f"story.{f}: present")

    level = story.get("level", "")
    if level not in curriculum["levels"]:
        error(f"story.level '{level}' is invalid. Must be A2, B1, or B2.")
        errors += 1
        return False

    level_config = curriculum["levels"][level]

    # ── Chapters section ──
    chapters = data.get("chapters", [])
    if not chapters:
        error("No chapters found")
        return False

    ok(f"Found {len(chapters)} chapter(s)")

    for ch in chapters:
        ch_num = ch.get("chapterNumber", "?")
        print(f"\n  {BOLD}Chapter {ch_num}: {ch.get('title', '(no title)')}{RESET}")

        # Required chapter fields
        ch_fields = ["chapterNumber", "title", "vocabulary", "grammarFocus", "content", "comprehension"]
        for field in ch_fields:
            if field not in ch or not ch[field]:
                error(f"  chapter.{field} is missing or empty")
                errors += 1

        # ── Word count ──
        all_text = " ".join(p.get("text", "") for p in ch.get("content", []))
        word_count = len(all_text.split())
        wc_range = level_config["targetWordCount"]
        if word_count < wc_range["min"]:
            error(f"  Story word count: {word_count} — below minimum {wc_range['min']} for {level}")
            errors += 1
        elif word_count > wc_range["max"]:
            warn(f"  Story word count: {word_count} — above recommended maximum {wc_range['max']} for {level}")
            warnings += 1
        else:
            ok(f"  Word count: {word_count} (within {wc_range['min']}–{wc_range['max']})")

        # ── Paragraph count ──
        para_count = len(ch.get("content", []))
        pc_range = level_config["paragraphCount"]
        if para_count < pc_range["min"]:
            warn(f"  Paragraphs: {para_count} — below recommended minimum {pc_range['min']}")
            warnings += 1
        elif para_count > pc_range["max"]:
            warn(f"  Paragraphs: {para_count} — above recommended maximum {pc_range['max']}")
            warnings += 1
        else:
            ok(f"  Paragraphs: {para_count}")

        # ── Vocabulary checks ──
        vocab_items = ch.get("vocabulary", [])
        vocab_range = level_config["vocabularyItemsPerChapter"]
        if len(vocab_items) < vocab_range["min"]:
            error(f"  Vocabulary items: {len(vocab_items)} — minimum is {vocab_range['min']}")
            errors += 1
        elif len(vocab_items) > vocab_range["max"]:
            warn(f"  Vocabulary items: {len(vocab_items)} — above recommended maximum {vocab_range['max']}")
            warnings += 1
        else:
            ok(f"  Vocabulary items: {len(vocab_items)}")

        for item in vocab_items:
            if not item.get("word"):
                error("  Vocabulary item missing 'word'")
                errors += 1
                continue
            if not item.get("definition"):
                error(f"  vocab '{item['word']}' missing definition")
                errors += 1
            if not item.get("exampleSentence"):
                error(f"  vocab '{item['word']}' missing exampleSentence")
                errors += 1
            # Check word appears in story
            word = item["word"].lower()
            if word not in all_text.lower():
                warn(f"  vocab word '{item['word']}' does not appear in story text — reader won't encounter it in context")
                warnings += 1
            else:
                ok(f"  vocab '{item['word']}' found in story text")

        # ── Grammar focus checks ──
        grammar = ch.get("grammarFocus", {})
        if not grammar.get("rule"):
            error("  grammarFocus.rule is missing")
            errors += 1
        if not grammar.get("explanation"):
            error("  grammarFocus.explanation is missing")
            errors += 1
        examples = grammar.get("examples", [])
        if len(examples) < 3:
            warn(f"  grammarFocus has {len(examples)} example(s) — recommend at least 4")
            warnings += 1
        else:
            ok(f"  grammarFocus has {len(examples)} examples")

        # ── Comprehension checks ──
        questions = ch.get("comprehension", [])
        q_range = level_config["comprehensionQuestions"]
        if len(questions) < q_range["min"]:
            error(f"  Comprehension questions: {len(questions)} — minimum is {q_range['min']}")
            errors += 1
        elif len(questions) > q_range["max"]:
            warn(f"  Comprehension questions: {len(questions)} — above recommended maximum {q_range['max']}")
            warnings += 1
        else:
            ok(f"  Comprehension questions: {len(questions)}")

        for q in questions:
            if not q.get("question"):
                error("  Question missing 'question' text")
                errors += 1
                continue
            opts = q.get("options", [])
            if len(opts) < 3:
                error(f"  Question '{q['question'][:40]}...' has fewer than 3 options")
                errors += 1
            correct = q.get("correctAnswer", "")
            if correct not in opts:
                error(f"  correctAnswer '{correct[:40]}' is not in options list")
                errors += 1
            if not q.get("explanation"):
                warn(f"  Question '{q['question'][:40]}...' missing explanation")
                warnings += 1
            else:
                ok(f"  Q{q.get('order','?')}: structure valid")

        # ── Dialogue check ──
        has_dialogue = '"' in all_text or '\u201c' in all_text or "'" in all_text
        dialogue_count = all_text.count('"') + all_text.count('\u201c')
        min_dialogue = {"A2": 2, "B1": 3, "B2": 3}.get(level, 2)
        # Rough check: count opening quotes
        if dialogue_count < min_dialogue:
            warn(f"  Story may have too little dialogue ({dialogue_count} quote marks) — aim for natural conversation")
            warnings += 1
        else:
            ok(f"  Dialogue present")

        # ── imagePlaceholder check ──
        for p in ch.get("content", []):
            if not p.get("imagePlaceholder") and not p.get("imageUrl"):
                warn(f"  Paragraph {p.get('order','?')} has no imagePlaceholder or imageUrl")
                warnings += 1

    # ── Summary ──
    print()
    if errors == 0 and warnings == 0:
        print(f"{GREEN}{BOLD}All checks passed.{RESET}")
    elif errors == 0:
        print(f"{YELLOW}{BOLD}{warnings} warning(s). No errors. Safe to import.{RESET}")
    else:
        print(f"{RED}{BOLD}{errors} error(s), {warnings} warning(s). Fix errors before importing.{RESET}")

    return errors == 0


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
def main():
    args = sys.argv[1:]

    if not args:
        print("Usage:")
        print("  python content/validate.py content/stories/file.json")
        print("  python content/validate.py content/stories/")
        print("  python content/validate.py --spec content/curriculum/my_spec.json")
        sys.exit(0)

    is_spec = "--spec" in args
    args = [a for a in args if a != "--spec"]

    all_passed = True

    for arg in args:
        path = Path(arg)

        if path.is_dir():
            files = sorted(path.glob("*.json"))
            if not files:
                print(f"No JSON files in {path}")
                continue
            for file_path in files:
                if is_spec:
                    passed = validate_spec(file_path)
                else:
                    passed = validate_story(file_path)
                if not passed:
                    all_passed = False
        elif path.is_file():
            if is_spec:
                passed = validate_spec(path)
            else:
                passed = validate_story(path)
            if not passed:
                all_passed = False
        else:
            print(f"File not found: {path}")
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
