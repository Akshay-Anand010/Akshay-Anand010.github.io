// Akshay GPT is a dialog. This file only sends the question and shows the reply.
// It does not contain facts about Akshay. Those live in data/life and in the model.

import { ASK_URL } from "../config.js";

const dialog = document.querySelector("#ask");
const form = document.querySelector("#ask-form");
const input = document.querySelector("#question");
const answer = document.querySelector("#answer");
const aside = document.querySelector("#aside");
const sources = document.querySelector("#sources");
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

function renderSources(payload) {
  // Search hits are real links. Text is set with textContent so a result
  // cannot inject HTML into the page.
  sources.replaceChildren();
  (payload.sources || []).forEach((hit) => {
    const link = document.createElement("a");
    link.href = hit.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const title = document.createElement("strong");
    title.textContent = hit.title;
    const snippet = document.createElement("span");
    snippet.textContent = hit.snippet || hit.url;
    link.append(title, snippet);
    sources.append(link);
  });
  if (payload.search_url) {
    const link = document.createElement("a");
    link.href = payload.search_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const title = document.createElement("strong");
    title.textContent = "Open this search in the browser";
    link.append(title);
    sources.append(link);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) {
    return;
  }

  answer.textContent = "Checking the notes. If this is not about Akshay, I'll look it up.";
  source.textContent = "";
  aside.textContent = "";
  sources.replaceChildren();
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
    aside.textContent = payload.aside || "";
    answer.textContent = payload.answer;
    source.textContent = payload.title ? `${payload.section} · ${payload.title}` : "";
    renderSources(payload);
  } catch (error) {
    aside.textContent = "";
    answer.textContent = "The model API did not answer. If you have not created the Hugging Face Space yet, that step is still left.";
    source.textContent = "";
    sources.replaceChildren();
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
