"""
Build the files that teaching and answering both read.

Plan step: life notes become training examples. This script does not
train the model and it does not start the website. You run it on your
laptop, and the Colab notebook runs it again before training, so the
notebook always sees the latest notes.

What it writes
- data/train.jsonl: one training example per line. Each example is a
  short conversation: system rules, a user message that contains a note
  plus a question, and an assistant reply that is the note itself.
- data/notes.json: the same notes, for the Hugging Face API. The API
  picks a note, then asks the model to answer from it. Training uses
  that same shape, so the model practices the job it will actually do.

A note is used only when its header says public: true. That keeps a
private draft from becoming training data or an API answer.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIFE_DIR = ROOT / "data" / "life"
SYSTEM_PROMPT_PATH = ROOT / "data" / "system_prompt.txt"
TRAIN_PATH = ROOT / "data" / "train.jsonl"
NOTES_PATH = ROOT / "data" / "notes.json"
# The Space uploads this copy so it can answer even before it fetches GitHub.
SPACE_NOTES_PATH = ROOT / "space" / "notes.json"


def read_note(path: Path) -> dict | None:
    """Split one markdown file into a header and a body.

    The header is the block between the first pair of --- lines.
    Files without public: true are skipped on purpose.
    """
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        raise ValueError(f"{path.name} must start with a --- header")

    _, header, body = raw.split("---", 2)
    fields = {}
    for line in header.strip().splitlines():
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()

    if fields.get("public", "").lower() != "true":
        return None

    return {
        "title": fields["title"],
        "section": fields["section"],
        "body": body.strip(),
        "source": path.name,
    }


def user_message(title: str, body: str, question: str) -> str:
    """The exact text the model sees for one question.

    The Hugging Face API builds this same layout. If you change the
    wording here, change space/app.py to match, then retrain.
    """
    return f"Note:\n{title}\n{body}\n\nQuestion:\n{question}\n"


def questions_for(note: dict) -> list[str]:
    """A few ways a visitor might ask about this note.

    These are training questions, not branches on the website. The
    website sends whatever the visitor types. The model is trained to
    answer from the attached note, including questions it has not seen.
    """
    title = note["title"]
    section = note["section"]
    return [
        f"Tell me about {title}.",
        f"What is {title}?",
        f"What should I know about Akshay's {section.lower()} on {title}?",
    ]


def build_example(system_prompt: str, note: dict, question: str) -> dict:
    """One supervised example: the reply is the note, not a new fact."""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message(note["title"], note["body"], question)},
            {"role": "assistant", "content": note["body"]},
        ]
    }


def main() -> None:
    system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    notes = []
    examples = []

    for path in sorted(LIFE_DIR.glob("*.md")):
        note = read_note(path)
        if note is None:
            print(f"skip {path.name} (not public)")
            continue
        notes.append(note)
        for question in questions_for(note):
            examples.append(build_example(system_prompt, note, question))

    if not notes:
        raise SystemExit("No public notes in data/life. Add a file with public: true.")

    TRAIN_PATH.write_text(
        "".join(json.dumps(example, ensure_ascii=False) + "\n" for example in examples),
        encoding="utf-8",
    )

    payload = {
        "system_prompt": system_prompt,
        "notes": notes,
    }
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    NOTES_PATH.write_text(encoded, encoding="utf-8")
    SPACE_NOTES_PATH.parent.mkdir(parents=True, exist_ok=True)
    SPACE_NOTES_PATH.write_text(encoded, encoding="utf-8")

    print(f"notes: {len(notes)}")
    print(f"training examples: {len(examples)}")
    print(f"wrote {TRAIN_PATH.relative_to(ROOT)}")
    print(f"wrote {NOTES_PATH.relative_to(ROOT)}")
    print(f"wrote {SPACE_NOTES_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
