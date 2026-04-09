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


def count_dialogue_spans(text):
    patterns = [
        r'"[^"\n]+"',
        r'“[^”\n]+”',
        r"(?<![A-Za-z])'[^'\n]{2,}'(?![A-Za-z])",
        r"(?<![A-Za-z])‘[^’\n]{2,}’(?![A-Za-z])",
    ]
    return sum(len(re.findall(pattern, text)) for pattern in patterns)


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

        optional_list_fields = ["formGuide", "usageNotes", "commonMistakes"]
        for field in optional_list_fields:
            value = grammar.get(field)
            if value is None:
                continue
            if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
                error(f"  grammarFocus.{field} must be a non-empty string list when provided")
                errors += 1
            else:
                ok(f"  grammarFocus.{field}: present ({len(value)} item(s))")

        contrast = grammar.get("contrastWith")
        if contrast is not None:
            if not isinstance(contrast, str) or not contrast.strip():
                error("  grammarFocus.contrastWith must be a non-empty string when provided")
                errors += 1
            else:
                ok("  grammarFocus.contrastWith: present")

        if level in ("A2", "B1", "B2") and not grammar.get("formGuide"):
            warn("  grammarFocus.formGuide is missing — add structure notes so the grammar tab teaches form, not only meaning")
            warnings += 1
        if level in ("A2", "B1", "B2") and not grammar.get("usageNotes"):
            warn("  grammarFocus.usageNotes is missing — add short teaching notes for when learners should use this form")
            warnings += 1
        if level in ("A2", "B1", "B2") and not grammar.get("commonMistakes"):
            warn("  grammarFocus.commonMistakes is missing — add likely learner mistakes for stronger instruction")
            warnings += 1

        examples = grammar.get("examples", [])
        if len(examples) < 3:
            warn(f"  grammarFocus has {len(examples)} example(s) — recommend at least 4")
            warnings += 1
        else:
            ok(f"  grammarFocus has {len(examples)} examples")

        # ── Grammar practice checks ──
        grammar_practice = ch.get("grammarPractice")
        if grammar_practice is not None:
            if not isinstance(grammar_practice, list):
                error("  grammarPractice must be an array when provided")
                errors += 1
            else:
                allowed_types = {
                    "multiple_choice",
                    "fill_blank",
                    "error_correction",
                    "sentence_transformation",
                }
                ok(f"  grammarPractice items: {len(grammar_practice)}")
                for item in grammar_practice:
                    order = item.get("order", "?")
                    prefix = f"  grammarPractice item {order}"

                    for field in ["order", "type", "prompt", "correctAnswer", "explanation"]:
                        if field not in item or item[field] in (None, "", []):
                            error(f"{prefix} missing {field}")
                            errors += 1

                    item_type = item.get("type")
                    if item_type and item_type not in allowed_types:
                        error(f"{prefix} has invalid type '{item_type}'")
                        errors += 1

                    options = item.get("options")
                    if options is not None:
                        if not isinstance(options, list) or not all(isinstance(opt, str) and opt.strip() for opt in options):
                            error(f"{prefix} options must be a non-empty string list when provided")
                            errors += 1
                        elif item_type == "multiple_choice" and item.get("correctAnswer") not in options:
                            error(f"{prefix} correctAnswer must exactly match one option for multiple_choice")
                            errors += 1

                    if item_type == "multiple_choice" and (not options or len(options) < 2):
                        error(f"{prefix} multiple_choice items need at least 2 options")
                        errors += 1

                practice_recommendation = {"A2": 4, "B1": 5, "B2": 5}.get(level)
                if practice_recommendation and len(grammar_practice) < practice_recommendation:
                    warn(f"  grammarPractice has {len(grammar_practice)} item(s) — recommend at least {practice_recommendation} for {level}")
                    warnings += 1

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
        dialogue_count = count_dialogue_spans(all_text)
        min_dialogue = {"A2": 2, "B1": 3, "B2": 3}.get(level, 2)
        if dialogue_count < min_dialogue:
            warn(f"  Story may have too little dialogue ({dialogue_count} dialogue span(s)) — aim for natural conversation")
            warnings += 1
        else:
            ok(f"  Dialogue present")

        # ── imagePlaceholder check ──
        for p in ch.get("content", []):
            if not p.get("imagePlaceholder") and not p.get("imageUrl"):
                warn(f"  Paragraph {p.get('order','?')} has no imagePlaceholder or imageUrl")
                warnings += 1

            annotations = p.get("grammarAnnotations", [])
            if annotations is not None and not isinstance(annotations, list):
                error(f"  Paragraph {p.get('order','?')} grammarAnnotations must be an array when provided")
                errors += 1
                continue

            for idx, annotation in enumerate(annotations, start=1):
                if not isinstance(annotation, dict):
                    error(f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} must be an object")
                    errors += 1
                    continue

                target_text = annotation.get("targetText", "")
                highlight_text = annotation.get("highlightText", "")
                occurrence = annotation.get("occurrence")
                if not target_text:
                    error(f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} is missing targetText")
                    errors += 1
                    continue

                if occurrence is not None and (not isinstance(occurrence, int) or occurrence < 1):
                    error(
                        f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} occurrence must be a positive integer when provided"
                    )
                    errors += 1

                paragraph_text = p.get("text", "")
                target_count = len(re.findall(re.escape(target_text), paragraph_text))
                if target_count == 0:
                    error(f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} targetText '{target_text}' does not appear in paragraph text")
                    errors += 1
                elif occurrence is None and target_count > 1:
                    warn(
                        f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} targetText '{target_text}' appears {target_count} times — add occurrence to avoid ambiguous highlighting"
                    )
                    warnings += 1
                elif isinstance(occurrence, int) and occurrence > target_count:
                    error(
                        f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} occurrence {occurrence} exceeds {target_count} matching targetText occurrence(s) in the paragraph"
                    )
                    errors += 1

                if highlight_text and highlight_text not in target_text:
                    error(f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} highlightText '{highlight_text}' is not inside targetText '{target_text}'")
                    errors += 1
                if highlight_text:
                    highlight_clean = highlight_text.strip().lower()
                    target_clean = target_text.strip().lower()
                    highlight_count = len(re.findall(re.escape(highlight_text), target_text))
                    if highlight_count > 1:
                        warn(
                            f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} highlightText '{highlight_text}' appears {highlight_count} times inside targetText — the reader will highlight only the first match"
                        )
                        warnings += 1
                    if len(highlight_clean) <= 3 and " " in target_clean and highlight_clean not in {"s", "es", "ed"}:
                        warn(
                            f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} uses very short highlightText '{highlight_text}' inside a longer phrase — prefer a whole-word highlight unless teaching a true ending"
                        )
                        warnings += 1
                tone = annotation.get("tone")
                if tone and tone not in {"aux", "ending", "question", "structure", "modal"}:
                    warn(f"  Paragraph {p.get('order','?')} grammarAnnotation {idx} tone '{tone}' is not a standard reader tone")
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
