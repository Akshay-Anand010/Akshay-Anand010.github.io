"""
The answer API that Hugging Face runs.

This is not the website. GitHub Pages cannot load a model. A visitor
types a question on https://akshay-anand010.github.io, the page sends
that question to POST /ask, and this file replies.

What this process does on each question
1. Load your notes (the same public notes the Colab notebook trains on).
2. Pick the note that shares the most words with the question.
3. If nothing matches, say so. The model is not asked to guess.
4. Otherwise load the public base model, attach the adapter you trained
   in Colab, and generate a reply from that note.

The original model weights stay frozen. The adapter is the only piece
that was trained, and it was trained on the last 4 blocks plus the
final output layer.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

# The public model Colab starts from. The Space downloads this itself.
BASE_MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct"
# The adapter notebook push. It does not exist until you run Colab.
ADAPTER = "Akshay-Anand010/akshay-gpt-adapter"
# Latest notes on GitHub, so a push can update facts without a new Space build.
NOTES_URL = (
    "https://raw.githubusercontent.com/Akshay-Anand010/"
    "akshay-anand010.github.io/main/data/notes.json"
)

# Words that appear in almost every question. Counting them would make
# unrelated notes look like a match.
STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "what", "who", "where",
    "when", "why", "how", "do", "does", "did", "you", "your", "about",
    "tell", "me", "of", "to", "in", "on", "for", "and", "or", "akshay",
    "please", "can", "could", "should", "i", "know",
}

# The page is allowed to call this API from the live site and from a
# local preview. Other websites are rejected by the browser.
ALLOWED_ORIGINS = [
    "https://akshay-anand010.github.io",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app = FastAPI(title="Akshay GPT")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Filled on the first question so the Space can boot without the model.
_tokenizer = None
_model = None
_load_error = None


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


def words(text: str) -> set[str]:
    """Lowercase words, with the question-glue words removed."""
    found = set(re.findall(r"[a-z0-9]+", text.lower()))
    return found - STOPWORDS


def load_notes() -> dict:
    """Prefer the copy shipped with the Space. Refresh from GitHub when it works."""
    local = json.loads(Path(__file__).with_name("notes.json").read_text(encoding="utf-8"))
    try:
        import urllib.request

        with urllib.request.urlopen(NOTES_URL, timeout=8) as response:
            remote = json.loads(response.read().decode("utf-8"))
        if remote.get("notes"):
            return remote
    except Exception:
        # GitHub being briefly unreachable should not take the API down.
        pass
    return local


def best_note(question: str, notes: list[dict]) -> dict | None:
    """The note with the largest word overlap with the question."""
    asked = words(question)
    if not asked:
        return None
    winner = None
    winner_score = 0
    for note in notes:
        haystack = words(f"{note['title']} {note['section']} {note['body']}")
        score = len(asked & haystack)
        if score > winner_score:
            winner = note
            winner_score = score
    return winner


def user_message(title: str, body: str, question: str) -> str:
    """Must stay identical to data/build_examples.py user_message."""
    return f"Note:\n{title}\n{body}\n\nQuestion:\n{question}\n"


def get_model():
    """Load the base model and the Colab adapter once per process.

    A free Space sleeps when nobody is asking. The first question after
    a sleep pays the download cost. Later questions reuse this pair.
    """
    global _tokenizer, _model, _load_error
    if _model is not None or _load_error is not None:
        return _tokenizer, _model

    try:
        from peft import PeftModel

        _tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
        if _tokenizer.pad_token is None:
            _tokenizer.pad_token = _tokenizer.eos_token
        base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=torch.float32)
        _model = PeftModel.from_pretrained(base, ADAPTER)
        _model.eval()
    except Exception as exc:
        _load_error = str(exc)
    return _tokenizer, _model


def generate(system_prompt: str, note: dict, question: str) -> str:
    """Ask the adapted model to answer from one note."""
    tokenizer, model = get_model()
    if model is None:
        raise RuntimeError(_load_error or "model failed to load")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message(note["title"], note["body"], question)},
    ]
    encoded = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    # Newer transformers return a dict with input_ids. Older ones return a tensor.
    input_ids = encoded["input_ids"] if hasattr(encoded, "keys") else encoded
    with torch.no_grad():
        output = model.generate(
            input_ids=input_ids,
            max_new_tokens=180,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
        )
    new_tokens = output[0][input_ids.shape[-1] :]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
    return text or note["body"]


@app.get("/")
def health():
    """Hugging Face checks that the process is up. This does not load the model."""
    return {"status": "ok", "model": BASE_MODEL, "adapter": ADAPTER}


@app.post("/ask")
def ask(body: AskRequest):
    """The only endpoint the website calls."""
    bundle = load_notes()
    note = best_note(body.question, bundle["notes"])
    if note is None:
        return {
            "answer": "I don't have that in Akshay's notes yet.",
            "title": None,
            "section": None,
        }

    try:
        answer = generate(bundle["system_prompt"], note, body.question.strip())
    except Exception as exc:
        return {
            "answer": (
                "The personal model is not available yet. "
                "Run the Colab notebook so the adapter is on Hugging Face, then ask again."
            ),
            "title": note["title"],
            "section": note["section"],
            "error": str(exc),
        }

    return {"answer": answer, "title": note["title"], "section": note["section"]}
