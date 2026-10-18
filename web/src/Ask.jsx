import { useEffect, useRef, useState } from "react";
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

const WAKE_LIMIT = 90000;
const RETRY_GAP = 2500;

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) stop();
    else signal?.addEventListener("abort", stop, { once: true });
  });
}

function coldStart(status) {
  return status === 408 || status === 502 || status === 503 || status === 504;
}

export default function Ask({ open, onClose }) {
  const [question, setQuestion] = useState("");
  const [aside, setAside] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(null);

  useEffect(() => {
    if (!open) {
      flight.current?.abort();
      return undefined;
    }
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(text) {
    const next = (text ?? question).trim();
    if (!next || busy) return;
    flight.current?.abort();
    const controller = new AbortController();
    flight.current = controller;
    setQuestion(next);
    setBusy(true);
    setAside("");
    setAnswer("Checking the notes. If this is not about Akshay, I'll look it up.");
    setSource("");
    const list = document.querySelector("#sources");
    if (list) list.replaceChildren();
    const started = Date.now();

    try {
      while (!controller.signal.aborted) {
        const slow = setTimeout(() => {
          setAnswer("Waking the model. The first question after a pause can take about a minute.");
        }, 8000);
        try {
          const response = await fetch(ASK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: next }),
            signal: controller.signal,
          });
          clearTimeout(slow);
          if (controller.signal.aborted) return;
          if (response.ok) {
            const payload = await response.json();
            setAside(payload.aside || "");
            setAnswer(payload.answer || "");
            setSource(payload.title ? `${payload.section} · ${payload.title}` : "");
            if (list) renderSources(list, payload);
            return;
          }
          const body = await response.text();
          if (/paused/i.test(body)) {
            setAnswer("The Hugging Face Space is paused, so this page cannot reach the model. Restart it on Hugging Face, then ask again.");
            if (list) {
              renderSources(list, {
                sources: [{ title: "Open the Space and restart it", url: SPACE_URL, snippet: "" }],
              });
            }
            return;
          }
          if (!coldStart(response.status) || Date.now() - started > WAKE_LIMIT) break;
        } catch (error) {
          clearTimeout(slow);
          if (error.name === "AbortError" || controller.signal.aborted) return;
          if (Date.now() - started > WAKE_LIMIT) break;
        }
        setAnswer("Waking the model. The first question after a pause can take about a minute.");
        try {
          await pause(RETRY_GAP, controller.signal);
        } catch (error) {
          if (error.name === "AbortError") return;
          throw error;
        }
      }
      if (!controller.signal.aborted) {
        setAnswer("The model is still waking up. Ask once more.");
      }
    } finally {
      if (flight.current === controller) setBusy(false);
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
            {busy ? "Waiting" : "Ask"}
          </button>
        </form>
        <div className="chips">
          {suggestions.map((item) => (
            <button key={item} type="button" className="chip" disabled={busy} onClick={() => submit(item)}>
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
