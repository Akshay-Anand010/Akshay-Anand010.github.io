// Akshay GPT is a dialog. This file only sends the question and shows the reply.
// It does not contain facts about Akshay. Those live in data/life and in the model.

import { ASK_URL } from "../config.js";

const dialog = document.querySelector("#ask");
const form = document.querySelector("#ask-form");
const input = document.querySelector("#question");
const answer = document.querySelector("#answer");
const source = document.querySelector("#source");
const openButton = document.querySelector("#open-ask");

const suggestions = [
  "Who is Akshay?",
  "What is ML Visual Lab?",
  "Where is Akshay based?",
  "What earlier projects has he built?",
];

function openAsk(prefill) {
  dialog.showModal();
  if (prefill) {
    input.value = prefill;
  }
  input.focus();
}

openButton.addEventListener("click", () => openAsk());

document.querySelectorAll("[data-ask]").forEach((button) => {
  button.addEventListener("click", () => openAsk(button.dataset.ask));
});

// Typing "/" from the page opens the dialog, the way a search box should.
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    openAsk();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) {
    return;
  }

  answer.textContent = "Waking the model on Hugging Face. The first question after a quiet period can take a minute.";
  source.textContent = "";
  form.querySelector("button").disabled = true;

  try {
    const response = await fetch(ASK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) {
      throw new Error(`The model API returned ${response.status}.`);
    }
    const payload = await response.json();
    answer.textContent = payload.answer;
    source.textContent = payload.title ? `${payload.section} · ${payload.title}` : "";
  } catch (error) {
    answer.textContent = "The model API did not answer. If you have not created the Hugging Face Space yet, that step is still left.";
    source.textContent = "";
  } finally {
    form.querySelector("button").disabled = false;
  }
});

const suggestionRow = document.querySelector("#suggestions");
suggestions.forEach((text) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = text;
  button.addEventListener("click", () => {
    input.value = text;
    form.requestSubmit();
  });
  suggestionRow.append(button);
});
