import { useEffect, useState } from "react";
import Ask from "./Ask.jsx";
import { projects, roles, study } from "./content.js";
import { formatDate, posts } from "./posts.js";

const tabs = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "life", label: "Life" },
  { id: "blog", label: "Blog" },
];

function readRoute() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (hash.startsWith("blog/")) return { tab: "blog", slug: hash.slice(5) };
  if (tabs.some((item) => item.id === hash)) return { tab: hash, slug: "" };
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
    setRoute({ tab: id, slug: "" });
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="who">
          <a className="brand" href="#home" onClick={() => go("home")}>
            Akshay Anand
          </a>
          <p className="tag">Software engineer in Bengaluru. From Patna.</p>
          <span className="links">
            <a href="https://github.com/Akshay-Anand010" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/akshay1998/" target="_blank" rel="noreferrer">LinkedIn</a>
          </span>
        </div>
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
          <button type="button" className="ask-launch" onClick={() => setAskOpen(true)}>
            ask
          </button>
        </nav>
      </header>

      {tab === "home" && <Home />}
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

function Home() {
  return (
    <main>
      <section className="hero">
        <h1>
          I build systems, and I like seeing how far they can <em>think</em>.
        </h1>
        <p className="lede">
          Services, scale, and the moment AI starts to help them.
          Chess, volleyball, and the next city after that.
        </p>
      </section>

      <section className="trio">
        <article>
          <p>01</p>
          <div>
            <h2>Scale</h2>
            <p>Services, load, caching, and the design decisions underneath them.</p>
          </div>
        </article>
        <article>
          <p>02</p>
          <div>
            <h2>AI, where it meets the system</h2>
            <p>Load prediction and smarter architecture, not a model dropped on top of a diagram.</p>
          </div>
        </article>
        <article>
          <p>03</p>
          <div>
            <h2>The rest of the week</h2>
            <p>Chess, volleyball, Kerala, Coorg, Ooty, and whatever city is next.</p>
          </div>
        </article>
      </section>

      {posts.length > 0 && (
        <section className="writing">
          <div className="section-head">
            <h2>Writing</h2>
            <a href="#blog">all</a>
          </div>
          <PostList items={posts.slice(0, 3)} />
        </section>
      )}

      <section className="projects">
        <div className="section-head">
          <h2>Built in public</h2>
          <span>04</span>
        </div>
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
      <p className="kicker">Bengaluru and before</p>
      <h1 className="sheet-title">Work</h1>
      <p className="lede">
        The places the engineering has happened, from internships to the current chapter.
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
        {post.date && <p className="dateline">{formatDate(post.date)}</p>}
        <article className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      </main>
    );
  }

  return (
    <main className="sheet">
      <p className="kicker">Notes</p>
      <h1 className="sheet-title">Blog</h1>
      {posts.length > 0 ? (
        <PostList items={posts} />
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
