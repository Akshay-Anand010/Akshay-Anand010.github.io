"""Write notebooks/finetune.ipynb. Run once, then this file can stay as a helper."""

import json
from pathlib import Path


def md(source: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": source.splitlines(keepends=True)}


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": source.splitlines(keepends=True),
    }


cells = [
    md(
        """# Fine-tune Akshay GPT

You run this notebook in Google Colab. It is the training step. It does not publish the website.

What it does:

1. Downloads this repo so it can read your latest notes.
2. Loads the public base model `HuggingFaceTB/SmolLM2-360M-Instruct`.
3. Freezes every original weight.
4. Trains a small adapter on the **last 4 blocks** and the final output layer.
5. Uploads that adapter to your Hugging Face account.

Before the first code cell: **Runtime → Change runtime type → T4 GPU**.

The base model has about 32 blocks, not 4. Block number 4 is still an early, general part of the network. Training that block would be the weak version of transfer learning. The last 4 blocks are the top of the network, which is the right place to teach it your notes.
"""
    ),
    code(
        """# Colab starts empty. These libraries are only for training.
# The website does not install them.
!pip install -q "transformers>=4.46.0" "peft>=0.13.0" "datasets>=3.0.0" "accelerate>=1.0.0" "huggingface_hub"
"""
    ),
    code(
        """import os
import torch

if not torch.cuda.is_available():
    raise SystemExit("No GPU is visible. Use Runtime → Change runtime type → T4 GPU, then run again.")

print("GPU:", torch.cuda.get_device_name(0))
"""
    ),
    md(
        """## Read the notes

The next cell clones the GitHub repo and builds `data/train.jsonl`. Each training line is a question, the note that contains the answer, and that note as the reply. Nothing here is wired into the website as an if-statement.
"""
    ),
    code(
        """import subprocess

REPO = "/content/akshay-site"
if not os.path.isdir(REPO):
    subprocess.check_call(
        ["git", "clone", "https://github.com/Akshay-Anand010/akshay-anand010.github.io.git", REPO]
    )
os.chdir(REPO)
subprocess.check_call(["python", "data/build_examples.py"])
"""
    ),
    md(
        """## Load the base model and freeze it

`get_peft_model` keeps the original weights frozen and marks only the adapter as trainable. `modules_to_save` is the exception we want: the final output layer (`lm_head`) is trained in full, because that is the layer that turns the top of the network into words.
"""
    ),
    code(
        """from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
if tokenizer.pad_token is None:
    # This model has no separate padding token. End-of-text is the usual stand-in.
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=torch.float16)

n_layers = model.config.num_hidden_layers
last_four = list(range(n_layers - 4, n_layers))
print(f"Blocks in the base model: {n_layers}")
print(f"Adapter will be trained on these blocks only: {last_four}")

lora = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
    # Attention and feed-forward matrices inside a block.
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    layers_to_transform=last_four,
    layers_pattern="layers",
    # Train the final output layer as well. Every earlier original weight stays frozen.
    modules_to_save=["lm_head"],
)
model = get_peft_model(model, lora)
model.print_trainable_parameters()
"""
    ),
    md(
        """## Teach it the notes

Labels on the question text are set to `-100`, which means “do not learn this token.” The loss is only on the assistant reply. The model is practicing how to answer once a note is in front of it. That is the same situation the website creates: the API attaches a note, then asks the model.
"""
    ),
    code(
        """from datasets import load_dataset
from transformers import Trainer, TrainingArguments

raw = load_dataset("json", data_files="data/train.jsonl", split="train")


def as_ids(value):
    # apply_chat_template sometimes returns a plain list and sometimes a dict.
    if hasattr(value, "input_ids"):
        return list(value["input_ids"])
    return list(value)


def tokenize_example(example):
    messages = example["messages"]
    full_ids = as_ids(tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=False))
    prompt_ids = as_ids(tokenizer.apply_chat_template(messages[:-1], tokenize=True, add_generation_prompt=True))
    if full_ids[: len(prompt_ids)] == prompt_ids:
        labels = [-100] * len(prompt_ids) + full_ids[len(prompt_ids) :]
    else:
        labels = list(full_ids)
    return {
        "input_ids": full_ids,
        "attention_mask": [1] * len(full_ids),
        "labels": labels,
    }


tokenized = raw.map(tokenize_example, remove_columns=raw.column_names)


def collate(features):
    \"\"\"Pad each example in the batch so the tensors are rectangular.\"\"\"
    pad_id = tokenizer.pad_token_id
    width = max(len(feature["input_ids"]) for feature in features)
    batch = {"input_ids": [], "attention_mask": [], "labels": []}
    for feature in features:
        pad = width - len(feature["input_ids"])
        batch["input_ids"].append(feature["input_ids"] + [pad_id] * pad)
        batch["attention_mask"].append(feature["attention_mask"] + [0] * pad)
        batch["labels"].append(feature["labels"] + [-100] * pad)
    return {key: torch.tensor(value) for key, value in batch.items()}


trainer = Trainer(
    model=model,
    args=TrainingArguments(
        output_dir="/content/akshay-gpt-adapter",
        num_train_epochs=3,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=1,
        save_strategy="no",
        fp16=True,
        report_to="none",
    ),
    train_dataset=tokenized,
    data_collator=collate,
)
trainer.train()
"""
    ),
    md(
        """## Upload the adapter

The next cell asks you to log in to Hugging Face. The cell after it uploads the adapter as a public model repo named `akshay-gpt-adapter`. The Space downloads that repo. Keep it public so the free Space can read it without a secret.
"""
    ),
    code(
        """from huggingface_hub import notebook_login

notebook_login()
"""
    ),
    code(
        """ADAPTER_REPO = "Ambitious-Akshay/akshay-gpt-adapter"
model.push_to_hub(ADAPTER_REPO, private=False)
tokenizer.push_to_hub(ADAPTER_REPO)
print("Uploaded. The Space can now load", ADAPTER_REPO)
"""
    ),
]

notebook = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
        "accelerator": "GPU",
        "colab": {"gpuType": "T4", "provenance": []},
    },
    "cells": cells,
}

path = Path(__file__).with_name("finetune.ipynb")
path.write_text(json.dumps(notebook, indent=2) + "\n", encoding="utf-8")
print(path)
