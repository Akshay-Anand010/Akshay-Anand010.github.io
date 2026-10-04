import { useEffect, useState } from "react";
import { ASK_URL, SPACE_URL } from "./config.js";

const suggestions = [
  "Who is Akshay?",
  "What does he like to play?",
  "Where has he traveled?",
  "What is ML Visual Lab?",
];

function renderSources(node, payload) {
  node.replaceChildren();
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
    node.append(link);
  });
  if (payload.search_url) {
    const link = document.createElement("a");
    link.href = payload.search_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const title = document.createElement("strong");
    title.textContent = "Open this search in the browser";
    link.append(title);
    node.append(link);
  }
}

export default function Ask({ open, onClose }) {
  const [question, setQuestion] = useState("");
  const [aside, setAside] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(text) {
    const next = (text ?? question).trim();
    if (!next) return;
    setQuestion(next);
    setBusy(true);
    setAside("");
    setAnswer("Checking the notes. If this is not about Akshay, I'll look it up.");
    setSource("");
    const list = document.querySelector("#sources");
    if (list) list.replaceChildren();

    try {
      const response = await fetch(ASK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: next }),
      });
      if (!response.ok) {
        const text = await response.text();
        const paused = response.status === 503 || /paused/i.test(text);
        const error = new Error(paused ? "paused" : String(response.status));
        throw error;
      }
      const payload = await response.json();
      setAside(payload.aside || "");
      setAnswer(payload.answer || "");
      setSource(payload.title ? `${payload.section} · ${payload.title}` : "");
      if (list) renderSources(list, payload);
    } catch (error) {
      if (error.message === "paused") {
        setAnswer("The Hugging Face Space is paused, so this page cannot reach the model. Restart it on Hugging Face, then ask again.");
        if (list) {
          renderSources(list, {
            sources: [{ title: "Open the Space and restart it", url: SPACE_URL, snippet: "" }],
          });
        }
      } else {
        setAnswer("The model API did not answer. The page calls the Ambitious-Akshay Space. If that Space is asleep or still building, wait a minute and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask-layer" role="presentation" onClick={onClose}>
      <div
        className="ask-panel"
        role="dialog"
        aria-labelledby="ask-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ask-head">
          <p id="ask-title">Akshay GPT</p>
          <button type="button" className="text-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <form
          className="ask-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about the person, or anything else"
            autoFocus
          />
          <button type="submit" disabled={busy}>
            Ask
          </button>
        </form>
        <div className="chips">
          {suggestions.map((item) => (
            <button key={item} type="button" className="chip" onClick={() => submit(item)}>
              {item}
            </button>
          ))}
        </div>
        {aside ? <p className="aside">{aside}</p> : null}
        {answer ? <p className="answer">{answer}</p> : null}
        <div id="sources" className="sources" />
        {source ? <p className="from">{source}</p> : null}
      </div>
    </div>
  );
}
