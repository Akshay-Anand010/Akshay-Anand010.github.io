import { useEffect, useState } from "react";
import Ask from "./Ask.jsx";
import { projects, roles, study } from "./content.js";

const tabs = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "life", label: "Life" },
];

function readTab() {
  const hash = window.location.hash.replace("#", "");
  return tabs.some((tab) => tab.id === hash) ? hash : "home";
}

export default function App() {
  const [tab, setTab] = useState(readTab);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
        event.preventDefault();
        setAskOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(id) {
    window.location.hash = id === "home" ? "" : id;
    setTab(id);
  }

  return (
    <div className="page">
      <header className="nav">
        <a className="brand" href="#home" onClick={() => go("home")}>
          Akshay Anand
        </a>
        <nav>
          {tabs.map((item) => (
            <a
              key={item.id}
              href={item.id === "home" ? "#home" : `#${item.id}`}
              className={tab === item.id ? "on" : ""}
              onClick={(event) => {
                event.preventDefault();
                go(item.id);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button type="button" className="ask-launch" onClick={() => setAskOpen(true)}>
          Akshay GPT
        </button>
      </header>

      {tab === "home" && <Home onWork={() => go("work")} />}
      {tab === "work" && <Work />}
      {tab === "life" && <Life />}

      <footer className="foot">
        <span>Press / to ask.</span>
        <a href="https://github.com/Akshay-Anand010">GitHub</a>
      </footer>

      <Ask open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}

function Home({ onWork }) {
  return (
    <main>
      <section className="hero">
        <p className="kicker">Software engineer · Bengaluru</p>
        <h1>
          I build systems,
          <span> and I like seeing how far they can think.</span>
        </h1>
        <p className="lede">
          Backend engineering, design for scale, and the point where AI starts to help
          those systems. From Patna. Chess, volleyball, and a habit of going places.
          The job history is a record, not the headline.
        </p>
        <button type="button" className="linkish" onClick={onWork}>
          Career sits on its own tab
        </button>
      </section>

      <section className="trio">
        <article>
          <p>01</p>
          <h2>Scale</h2>
          <p>Services, load, caching, and the design decisions underneath them.</p>
        </article>
        <article>
          <p>02</p>
          <h2>AI, where it meets the system</h2>
          <p>Load prediction and smarter architecture, not a model dropped on top of a diagram.</p>
        </article>
        <article>
          <p>03</p>
          <h2>The rest of the week</h2>
          <p>Chess, volleyball, Kerala, Coorg, Ooty, and whatever city is next.</p>
        </article>
      </section>

      <section className="projects">
        <h2>Built in public</h2>
        {projects.map((project, index) => (
          <a key={project.title} className="project" href={project.href}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>
              <h3>{project.title}</h3>
              <p>{project.text}</p>
            </span>
            <span className="arrow">↗</span>
          </a>
        ))}
      </section>
    </main>
  );
}

function Work() {
  return (
    <main className="sheet">
      <p className="kicker">A record, not a personality</p>
      <h1 className="sheet-title">Work</h1>
      <p className="lede">
        Engineer and software developer. These are the places that work has happened.
        None of them is the whole story.
      </p>
      <ol className="timeline">
        {roles.map((role) => (
          <li key={role.place}>
            <p className="when">{role.when}</p>
            <div>
              <h2>{role.place}</h2>
              <p className="role">{role.title}</p>
              <p>{role.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <h2 className="study-title">Study</h2>
      <ul className="study">
        {study.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </main>
  );
}

function Life() {
  return (
    <main className="sheet">
      <p className="kicker">Off the clock</p>
      <h1 className="sheet-title">Life</h1>
      <div className="life-grid">
        <article>
          <h2>Play</h2>
          <p>Chess is the game he loves. Volleyball is the other one.</p>
        </article>
        <article>
          <h2>Places</h2>
          <p>A lot of Kerala, including Munnar. Karnataka, including Coorg. And Ooty.</p>
        </article>
        <article>
          <h2>Home</h2>
          <p>Born in Patna, Bihar. Lives in Bengaluru. Hindi and English.</p>
        </article>
        <article>
          <h2>Aim</h2>
          <p>The cutting edge: AI that helps a system scale, not a title on a slide.</p>
        </article>
      </div>
    </main>
  );
}
