"""
Upload this folder to the free Hugging Face Space.

Run this while logged into the Ambitious-Akshay Hugging Face account.
The Space must be Gradio so the free ZeroGPU machine can be selected.
It does not train the model. Training is the Colab notebook.

    huggingface-cli login
    python space/publish.py

The command asks for a Hugging Face token with write access.
"""

from pathlib import Path

from huggingface_hub import HfApi

SPACE_ID = "Ambitious-Akshay/akshay-gpt"
FILES = ["app.py", "route.py", "web_search.py", "requirements.txt", "README.md", "notes.json"]


def main() -> None:
    api = HfApi()
    here = Path(__file__).resolve().parent
    # Creating is a no-op when the Space already exists.
    api.create_repo(SPACE_ID, repo_type="space", space_sdk="gradio", exist_ok=True)
    for name in FILES:
        api.upload_file(
            path_or_fileobj=str(here / name),
            path_in_repo=name,
            repo_id=SPACE_ID,
            repo_type="space",
        )
        print(f"uploaded {name}")
    print("Space files are on Hugging Face. The first build can take several minutes.")
    print("API: https://ambitious-akshay-akshay-gpt.hf.space/ask")


if __name__ == "__main__":
    main()
