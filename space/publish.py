"""
Upload this folder to the free Hugging Face Space.

Run this after you create an empty public Docker Space named akshay-gpt.
It does not train the model. Training is the Colab notebook.

    huggingface-cli login
    python space/publish.py

The command asks for a Hugging Face token with write access.
"""

from pathlib import Path

from huggingface_hub import HfApi

SPACE_ID = "Akshay-Anand010/akshay-gpt"
FILES = ["app.py", "requirements.txt", "Dockerfile", "README.md", "notes.json"]


def main() -> None:
    api = HfApi()
    here = Path(__file__).resolve().parent
    # Creating is a no-op when the Space already exists.
    api.create_repo(SPACE_ID, repo_type="space", space_sdk="docker", exist_ok=True)
    for name in FILES:
        api.upload_file(
            path_or_fileobj=str(here / name),
            path_in_repo=name,
            repo_id=SPACE_ID,
            repo_type="space",
        )
        print(f"uploaded {name}")
    print("Space files are on Hugging Face. The first build can take several minutes.")
    print("API: https://akshay-anand010-akshay-gpt.hf.space/ask")


if __name__ == "__main__":
    main()
