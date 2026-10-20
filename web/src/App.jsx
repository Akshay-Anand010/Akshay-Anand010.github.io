import { useCallback, useEffect, useState } from "react";
import Ask from "./Ask.jsx";
import Figure from "./Figure.jsx";
import { projects, roles, study } from "./content.js";
import { formatDate, posts } from "./posts.js";

const tabs = [
  { id: "home", label: "Home", key: "H" },
  { id: "work", label: "Work", key: "W" },
  { id: "life", label: "Life", key: "L" },
  { id: "blog", label: "Blog", key: "B" },
];

function readRoute() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (hash.startsWith("blog/")) return { tab: "blog", slug: hash.slice(5) };
  if (hash === "home" || tabs.some((item) => item.id === hash)) {
    return { tab: hash === "home" ? "home" : hash, slug: "" };
  }
  return { tab: "home", slug: "" };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [askOpen, setAskOpen] = useState(false);
  const { tab, slug } = route;

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((id) => {
    window.location.hash = id === "home" ? "home" : id;
    setRoute({ tab: id, slug: "" });
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      const key = event.key.length === 1 ? event.key.toUpperCase() : "";
      if (key === "/") {
        event.preventDefault();
        setAskOpen(true);
        return;
      }
      if (key === "G") {
        event.preventDefault();
        window.open("https://github.com/Akshay-Anand010", "_blank", "noopener,noreferrer");
        return;
      }
      const next = tabs.find((item) => item.key === key);
      if (!next) return;
      event.preventDefault();
      go(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

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
              <span className="key">[ {item.key} ]</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="nav-end">
          <a href="https://github.com/Akshay-Anand010" target="_blank" rel="noreferrer">
            <span className="key">[ G ]</span>GitHub
          </a>
          <a href="https://www.linkedin.com/in/akshay1998/" target="_blank" rel="noreferrer">LinkedIn</a>
          <button type="button" className="ask-launch" onClick={() => setAskOpen(true)}>
            <span className="key">[ / ]</span>Ask
          </button>
        </div>
      </header>

      {tab === "home" && <Home onAsk={() => setAskOpen(true)} />}
      {tab === "work" && <Work />}
      {tab === "life" && <Life />}
      {tab === "blog" && <Blog slug={slug} />}

      <footer className="foot">
        <span><kbd>/</kbd> to ask</span>
      </footer>

      <Ask open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}

function Home({ onAsk }) {
  return (
    <main>
      <div className="stage">
        <span className="crop tl" aria-hidden="true" />
        <span className="crop tr" aria-hidden="true" />
        <span className="crop bl" aria-hidden="true" />
        <span className="crop br" aria-hidden="true" />
        <div className="stage-tabs">
          <span>Akshay</span>
          <span>Systems</span>
          <span>Scale</span>
          <span>Bengaluru</span>
        </div>
        <section className="hero">
          <div className="hero-copy">
            <p className="comment">// software engineer in bengaluru. from patna.</p>
            <h1>
              I build<br />systems that<br /><em>think</em><span className="caret" />
            </h1>
            <p className="lede">
              Services, scale, and the moment AI starts to help them.
              Chess, volleyball, and the next city after that.
            </p>
            <div className="actions">
              <button type="button" className="gold" onClick={onAsk}>Ask</button>
              <a className="ghost" href="https://github.com/Akshay-Anand010" target="_blank" rel="noreferrer">GitHub →</a>
            </div>
          </div>
          <dl className="metrics">
            <div>
              <dt>From</dt>
              <dd><span className="flap">Patna</span></dd>
              <p>Bihar</p>
            </div>
            <div>
              <dt>Now</dt>
              <dd className="hot"><span className="flap">BLR</span></dd>
              <p>Bengaluru</p>
            </div>
            <div>
              <dt>Plays</dt>
              <dd><span className="flap">Chess</span></dd>
              <p>and volleyball</p>
            </div>
            <div>
              <dt>Focus</dt>
              <dd className="hot"><span className="flap">Scale</span></dd>
              <p>load, cache, design</p>
            </div>
          </dl>
        </section>
        <section className="trio">
        <article>
          <p>Systems</p>
          <h2>Scale</h2>
          <p>Services, load, caching, and the design decisions underneath them.</p>
        </article>
        <article>
          <p>Models</p>
          <h2>Where AI meets the system</h2>
          <p>Load prediction and smarter architecture, not a model dropped on top of a diagram.</p>
        </article>
        <article>
          <p>Off hours</p>
          <h2>The rest of the week</h2>
          <p>Chess, volleyball, Kerala, Coorg, Ooty, and whatever city is next.</p>
        </article>
        </section>
        <section className="featured">
        {posts[0] && (
          <article className="feature">
            <p className="slash">/ Featured post</p>
            <div className="feature-body">
              <div className="win" aria-hidden="true">
                <div className="win-bar">
                  <span className="dots"><i /><i /><i /></span>
                  <span>Fig. 1</span>
                </div>
                <Figure variant="rings" />
              </div>
              <div>
                <h2>
                  <a href={`#blog/${posts[0].slug}`}>{posts[0].title}</a>
                </h2>
                <p>{posts[0].summary}</p>
                <span className="kind">Blog</span>
              </div>
            </div>
          </article>
        )}
        <article className="feature">
          <p className="slash">/ Featured project</p>
          <div className="feature-body">
            <div className="win" aria-hidden="true">
              <div className="win-bar">
                <span className="dots"><i /><i /><i /></span>
                <span>Fig. 2</span>
              </div>
              <Figure variant="field" />
            </div>
            <div>
              <h2>
                <a href={projects[0].href} target="_blank" rel="noreferrer">{projects[0].title}</a>
              </h2>
              <p>{projects[0].text}</p>
              <span className="kind">Lab</span>
            </div>
          </div>
        </article>
        </section>
      </div>

      <section className="projects">
        <div className="section-head">
          <p className="slash">/ Built</p>
        </div>
        <div className="project-board">
          {projects.slice(1).map((project, index) => (
            <a key={project.title} className="project" href={project.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>
                <h3>{project.title}</h3>
                <p>{project.text}</p>
              </span>
              <span className="arrow">→</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function Work() {
  return (
    <main className="sheet">
      <p className="kicker">Bengaluru and before</p>
      <h1 className="sheet-title">Work</h1>
      <p className="lede">
        The places the engineering has happened, from internships to the current chapter.
      </p>
      <ol className="ledger">
        {roles.map((role) => (
          <li key={role.place}>
            <p className="stamp">{role.stamp}</p>
            <div>
              <h2>{role.place}</h2>
              <p className="role">{role.title}</p>
              <p>{role.text}</p>
            </div>
            <span className={role.chip === "Now" ? "kind now" : "kind"}>{role.chip}</span>
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

function PostList({ items }) {
  return (
    <div className="post-list">
      {items.map((post) => (
        <a key={post.slug} href={`#blog/${post.slug}`}>
          <span>{post.title}</span>
          <time>{formatDate(post.date)}</time>
        </a>
      ))}
    </div>
  );
}

function Blog({ slug }) {
  const post = posts.find((item) => item.slug === slug);
  if (post) {
    return (
      <main className="sheet">
        <a className="back" href="#blog">Blog</a>
        <h1 className="sheet-title">{post.title}</h1>
        <p className="dateline">
          {post.date && <span>{formatDate(post.date)}</span>}
          {post.source && (
            <a href={post.source} target="_blank" rel="noreferrer">Medium</a>
          )}
        </p>
        <article className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      </main>
    );
  }

  return (
    <main className="sheet">
      <p className="kicker">Notes</p>
      <h1 className="sheet-title">Blog</h1>
      {posts.length > 0 ? (
        <div className="project-board post-board">
          <PostList items={posts} />
        </div>
      ) : (
        <div className="empty">
          <p>Nothing published yet. A post is a markdown file.</p>
          <pre>{`web/posts/hello.md

---
title: Hello
date: 2026-10-17
summary: One line for the list.
---

Write the post here.`}</pre>
        </div>
      )}
    </main>
  );
}

function Life() {
  return (
    <main className="sheet">
      <p className="kicker">Away from the keyboard</p>
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
