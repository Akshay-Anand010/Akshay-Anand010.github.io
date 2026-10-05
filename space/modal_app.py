"""
Temporary host for POST /ask while the Hugging Face account cannot
start a Space.

Run from the repo root, after `modal setup` as akshayanand771:

    modal deploy space/modal_app.py

Modal prints a URL. The website should call that URL plus /ask.
A T4 is enough for SmolLM2-360M. The container exits about two
minutes after the last question, so idle time does not spend credit.
The first question after a sleep pays for the model download.
"""

import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch",
        "transformers>=4.46.0",
        "peft>=0.13.0",
        "accelerate>=1.0.0",
        "fastapi",
        "pydantic",
        "gradio>=5.49.1",
        "langchain>=0.3.0",
        "langchain-community>=0.3.0",
        "ddgs>=9.0.0",
    )
    .add_local_dir("space", remote_path="/root/space")
)

app = modal.App("akshay-gpt", image=image)


@app.function(gpu="T4", timeout=900, scaledown_window=120)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    """Serve the same Gradio app the Space uses, including POST /ask."""
    import sys

    sys.path.insert(0, "/root/space")
    import app as akshay

    return akshay.demo.app
