# How this site is wired

The page people visit is https://akshay-anand010.github.io.
The model does not run on that page. A question takes this path:

1. A visitor opens the site and uses Akshay GPT.
2. The page sends the question to a Hugging Face Space, `POST /ask`.
3. The Space loads a small public model plus the adapter you trained in Colab.
4. It answers from your notes and the page shows that reply.

Your laptop does not stay on. GitHub Pages keeps the page online. Hugging Face keeps the API online.

This repository is only the personal site. It does not change any other project.

## What you edit

Facts live in `data/life/*.md`. Each file needs a header with `public: true`. Files without that are ignored.

After you add a note:

```bash
python3 data/build_examples.py
```

Commit the result and push. That updates the note bundle. It does not retrain the model. Retraining is the notebook below, because GitHub's free builders have no GPU.

## Train the model in Colab

I wrote the notebook. You run it.

1. Open [notebooks/finetune.ipynb](notebooks/finetune.ipynb) in Google Colab.
2. Set the runtime to a GPU. Runtime, Change runtime type, T4 is enough.
3. Run the cells from top to bottom.
4. When the login cell asks, sign in to Hugging Face with a write token.

The notebook freezes every original weight of `HuggingFaceTB/SmolLM2-360M-Instruct`. It trains a small adapter on the last 4 blocks and the final output layer, using the notes in this repo. It then uploads the adapter to `Akshay-Anand010/akshay-gpt-adapter`.

Run the notebook again after the notes change if you want the model to learn the new facts.

## Put the API on Hugging Face

1. Create a free Hugging Face account if you do not have one.
2. From this repo, after `huggingface-cli login`:

```bash
pip install huggingface_hub
python space/publish.py
```

3. On the Space settings, leave the hardware on the free CPU.
4. Wait until the Space build is green. The first question after it sleeps can take about a minute.

The page already calls `https://akshay-anand010-akshay-gpt.hf.space/ask`. That address is in `site/config.js`.

## Preview the page on your laptop

```bash
python3 -m http.server 8080 -d site
```

Open http://localhost:8080. The live site updates on its own when you push to `main`.
