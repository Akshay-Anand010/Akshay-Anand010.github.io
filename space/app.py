"""
The answer API that Hugging Face runs.

This is not the website. GitHub Pages cannot load a model. A visitor
types a question on https://akshay-anand010.github.io, the page sends
that question to POST /ask, and this file replies.

What this process does on each question
1. Decide if the question is about Akshay, using space/route.py.
2. If a note matches, answer from that note with the adapted model.
3. If it is about him and no note matches, say so. Do not guess.
4. If it is a general question, say that this model was not built for that,
   draft a short answer when the base model is loaded, and use the
   LangChain search tool in space/web_search.py to show public results
   plus a link that opens the same search in a browser.

The original model weights stay frozen. The adapter is the only piece
that was trained, and it was trained on the last 4 blocks plus the
final output layer.
"""

from __future__ import annotations

import json
from pathlib import Path

import gradio as gr
import torch
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

import route
import web_search

# The public model Colab starts from. The Space downloads this itself.
BASE_MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct"
# The adapter notebook push. It does not exist until you run Colab.
ADAPTER = "Ambitious-Akshay/akshay-gpt-adapter"
# Latest notes on GitHub, so a push can update facts without a new Space build.
NOTES_URL = (
    "https://raw.githubusercontent.com/Akshay-Anand010/"
    "akshay-anand010.github.io/main/data/notes.json"
)

# Said before any answer that is not about Akshay. The page shows this
# on its own line so it does not get mixed into the actual answer.
OFF_TOPIC_LINE = (
    "Yeah, I can give you an answer, but it was not intended for this. "
    "This model is only for production."
)

UNKNOWN_LINE = "I don't have that in the notes on Akshay, so I won't guess."

# The page is allowed to call this API from the live site and from a
# local preview. Other websites are rejected by the browser.
ALLOWED_ORIGINS = [
    "https://akshay-anand010.github.io",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

# Filled on the first question so the Space can boot without the model.
# _adapter_on is false when the Colab upload is missing. The base model
# can still draft a general answer. It must not invent Akshay's life.
_tokenizer = None
_model = None
_load_error = None
_adapter_on = False


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


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


def user_message(title: str, body: str, question: str) -> str:
    """Must stay identical to data/build_examples.py user_message."""
    return f"Note:\n{title}\n{body}\n\nQuestion:\n{question}\n"


def get_model():
    """Load the base model once, then attach the Colab adapter if it exists.

    A free Space sleeps when nobody is asking. The first question after
    a sleep pays the download cost. Later questions reuse this pair.
    If the adapter was never uploaded, the base model stays available for
    general questions only.
    """
    global _tokenizer, _model, _load_error, _adapter_on
    if _model is not None or _load_error is not None:
        return _tokenizer, _model

    try:
        from peft import PeftModel

        _tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
        if _tokenizer.pad_token is None:
            _tokenizer.pad_token = _tokenizer.eos_token
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=dtype)
        if torch.cuda.is_available():
            base = base.to("cuda")
        try:
            _model = PeftModel.from_pretrained(base, ADAPTER)
            _adapter_on = True
        except Exception:
            _model = base
            _adapter_on = False
        _model.eval()
    except Exception as exc:
        _load_error = str(exc)
    return _tokenizer, _model


def complete(messages: list[dict], limit: int) -> str:
    """Turn a chat into the model's new text. Shared by both answer paths."""
    tokenizer, model = get_model()
    if model is None:
        raise RuntimeError(_load_error or "model failed to load")

    encoded = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )
    input_ids = encoded["input_ids"] if hasattr(encoded, "keys") else encoded
    input_ids = input_ids.to(next(model.parameters()).device)
    with torch.no_grad():
        output = model.generate(
            input_ids=input_ids,
            max_new_tokens=limit,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
        )
    new_tokens = output[0][input_ids.shape[-1] :]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def repeats_itself(text: str) -> bool:
    """A stuck model repeats one word. That is not an answer."""
    words = [word.lower() for word in text.split() if word]
    if len(words) < 8:
        return False
    most = max(words.count(word) for word in set(words))
    return most >= 6


def generate(system_prompt: str, note: dict, question: str) -> str:
    """Ask the adapted model to answer from one note.

    Without the adapter, return the note itself. The base model has never
    been trained on these facts and would invent them. A reply that repeats
    one word is treated the same way.
    """
    if not _adapter_on:
        get_model()
    if not _adapter_on:
        return note["body"]

    text = complete(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message(note["title"], note["body"], question)},
        ],
        limit=180,
    )
    if not text or repeats_itself(text):
        return note["body"]
    return text


def draft_general(question: str) -> str:
    """A short answer for a question that is not about Akshay.

    The adapter is turned off for this call so the reply is not a life note.
    If the model never loaded, the search results still stand on their own.
    """
    _tokenizer, model = get_model()
    if model is None:
        return ""
    messages = [
        {
            "role": "system",
            "content": (
                "Answer the question in a few sentences or a short code block. "
                "Do not mention Akshay and do not invent a biography."
            ),
        },
        {"role": "user", "content": question},
    ]
    try:
        if _adapter_on and hasattr(model, "disable_adapter"):
            with model.disable_adapter():
                return complete(messages, limit=160)
        return complete(messages, limit=160)
    except Exception:
        return ""


def general_reply(question: str) -> dict:
    """Off-topic question: a warning line, a draft, and public search hits."""
    draft = draft_general(question)
    sources = web_search.search(question)
    answer = draft or "Here is what a web search returned."
    return {
        "kind": "general",
        "aside": OFF_TOPIC_LINE,
        "answer": answer,
        "title": None,
        "section": None,
        "sources": sources,
        "search_url": web_search.browser_url(question),
    }


def answer_question(question: str) -> dict:
    """The reply both the website and the Gradio box use."""
    bundle = load_notes()
    kind, note = route.classify(question, bundle["notes"])

    if kind == "unknown":
        return {
            "kind": "unknown",
            "aside": "",
            "answer": UNKNOWN_LINE,
            "title": None,
            "section": None,
            "sources": [],
            "search_url": "",
        }

    if kind == "general":
        return general_reply(question)

    try:
        answer = generate(bundle["system_prompt"], note, question)
    except Exception as exc:
        return {
            "kind": "about",
            "aside": "",
            "answer": note["body"],
            "title": note["title"],
            "section": note["section"],
            "sources": [],
            "search_url": "",
            "error": str(exc),
        }

    return {
        "kind": "about",
        "aside": "",
        "answer": answer,
        "title": note["title"],
        "section": note["section"],
        "sources": [],
        "search_url": "",
    }


try:
    import spaces
except ImportError:
    # ZeroGPU Spaces provide this module. Local runs and CPU builds do not.
    class spaces:  # type: ignore
        @staticmethod
        def GPU(duration=1):
            def decorator(fn):
                return fn
            return decorator


@spaces.GPU(duration=1)
def zerogpu_ready():
    """Lets Hugging Face attach the free ZeroGPU machine.

    Answers themselves stay on CPU. Calling this on every question would
    spend the visitor's GPU quota for a model this small.
    """
    return "ready"


def show_in_box(question: str) -> str:
    """Gradio shows one text box. The website still gets the structured JSON."""
    payload = answer_question(question.strip())
    parts = [payload.get("aside") or "", payload.get("answer") or ""]
    return "\n\n".join(part for part in parts if part)


with gr.Blocks(title="Akshay GPT") as demo:
    gr.Markdown("# Akshay GPT")
    question_box = gr.Textbox(label="Question", placeholder="Ask about Akshay")
    answer_box = gr.Textbox(label="Answer", lines=8)
    ask_button = gr.Button("Ask")
    ask_button.click(show_in_box, inputs=question_box, outputs=answer_box)

# The with-block above builds demo.app. Routes added here stay only if
# launch() is given this same app. Hugging Face calls demo.launch(), so
# the wrapper below hands that app through.
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@demo.app.get("/")
def health():
    """Hugging Face checks that the process is up. This does not load the model."""
    return {"status": "ok", "model": BASE_MODEL, "adapter": ADAPTER}


@demo.app.post("/ask")
def ask(body: AskRequest):
    """The endpoint the website calls."""
    return answer_question(body.question.strip())


_launch = demo.launch


def launch(*args, **kwargs):
    """Keep /ask on the server Gradio starts, and allow the GitHub Pages origin."""
    kwargs["_app"] = demo.app
    kwargs["strict_cors"] = False
    return _launch(*args, **kwargs)


demo.launch = launch
