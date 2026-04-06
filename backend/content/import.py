#!/usr/bin/env python3
"""
Content Import Script for Grammar Reading App

Usage:
    python import.py                          # import all stories in content/stories/
    python import.py stories/my_story.json   # import a single file
    python import.py --clear                  # clear all stories/chapters and re-import all

Environment variables:
    MONGODB_URI      MongoDB connection string (default: mongodb://localhost:27017)
    MONGODB_DATABASE Database name (default: grammar)
"""

import json
import os
import sys
from pathlib import Path

try:
    from pymongo import MongoClient, UpdateOne
except ImportError:
    print("Error: pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "grammar")

STORIES_DIR = Path(__file__).parent / "stories"


def connect():
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    return db


def import_file(db, file_path: Path, clear: bool = False):
    print(f"Importing: {file_path.name}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    story_data = data["story"]
    chapters_data = data.get("chapters", [])

    # Upsert story by title + level (idempotent)
    # Do not set totalChapters yet — we compute it from actual DB count after chapter upsert.
    stories_col = db["stories"]
    story_fields = {k: v for k, v in story_data.items()}
    result = stories_col.find_one_and_update(
        {"title": story_data["title"], "level": story_data["level"]},
        {"$set": story_fields},
        upsert=True,
        return_document=True,
    )
    story_id = str(result["_id"])
    print(f"  Story: '{story_data['title']}' (id={story_id})")

    if clear:
        db["chapters"].delete_many({"storyId": story_id})
        print(f"  Cleared existing chapters for story {story_id}")

    # Upsert chapters by storyId + chapterNumber (idempotent)
    chapters_col = db["chapters"]
    for chapter in chapters_data:
        chapters_col.find_one_and_update(
            {"storyId": story_id, "chapterNumber": chapter["chapterNumber"]},
            {"$set": {**chapter, "storyId": story_id}},
            upsert=True,
        )
        print(f"  Chapter {chapter['chapterNumber']}: '{chapter['title']}'")

    # Update totalChapters to reflect actual chapter count in DB
    actual_count = chapters_col.count_documents({"storyId": story_id})
    stories_col.update_one(
        {"_id": result["_id"]},
        {"$set": {"totalChapters": actual_count}},
    )
    print(f"  Done: {len(chapters_data)} chapter(s) imported ({actual_count} total in story).\n")


def resolve_path(arg: str) -> Path:
    path = Path(arg)
    if not path.is_absolute():
        cwd_path = Path.cwd() / path
        if cwd_path.exists():
            return cwd_path
        return STORIES_DIR / path.name
    return path


def main():
    args = sys.argv[1:]
    clear    = "--clear"    in args
    validate = "--validate" in args
    args = [a for a in args if a not in ("--clear", "--validate")]

    # If --validate is requested, run validation first and abort on errors.
    if validate:
        try:
            from validate import validate_story
        except ImportError:
            print("Error: validate.py not found next to import.py")
            sys.exit(1)

        files_to_check = []
        if args:
            for arg in args:
                p = resolve_path(arg)
                if not p.exists():
                    print(f"File not found: {p}")
                    sys.exit(1)
                files_to_check.append(p)
        else:
            files_to_check = sorted(STORIES_DIR.glob("*.json"))

        all_ok = True
        for p in files_to_check:
            if not validate_story(p):
                all_ok = False
        if not all_ok:
            print("\nValidation failed — import aborted. Fix the errors above and retry.")
            sys.exit(1)
        print("\nValidation passed. Proceeding with import...\n")

    db = connect()
    print(f"Connected to {MONGODB_URI} / database: {MONGODB_DATABASE}\n")

    if args:
        for arg in args:
            path = resolve_path(arg)
            if not path.exists():
                print(f"File not found: {path}")
                sys.exit(1)
            import_file(db, path, clear=clear)
    else:
        files = sorted(STORIES_DIR.glob("*.json"))
        if not files:
            print(f"No JSON files found in {STORIES_DIR}")
            sys.exit(0)
        for file_path in files:
            import_file(db, file_path, clear=clear)

    print("Import complete.")


if __name__ == "__main__":
    main()
