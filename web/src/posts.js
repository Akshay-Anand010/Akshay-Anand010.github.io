// A post is a markdown file in web/posts.
//
// web/posts/hello.md
// ---
// title: Hello
// date: 2026-10-17
// summary: One line for the list.
// ---
//
// The post itself.

const files = import.meta.glob("../posts/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(value) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

export function renderMarkdown(source) {
  const lines = escapeHtml(source).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${code.join("\n")}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const item = /^[-*] (.+)$/.exec(line);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) html.push(`<pre><code>${code.join("\n")}</code></pre>`);
  return html.join("\n");
}

function parse(raw, path) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  const meta = {};
  let body = raw.trim();
  if (match) {
    body = match[2].trim();
    for (const line of match[1].split("\n")) {
      const split = line.indexOf(":");
      if (split === -1) continue;
      const key = line.slice(0, split).trim();
      meta[key] = line.slice(split + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const slug = path.split("/").pop().replace(/\.md$/, "");
  const summary = meta.summary || body.split("\n").find((line) => line.trim() && !line.startsWith("#")) || "";
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    summary: summary.replace(/^#+\s*/, ""),
    html: renderMarkdown(body),
  };
}

export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

export const posts = Object.entries(files)
  .map(([path, raw]) => parse(raw, path))
  .sort((a, b) => (a.date < b.date ? 1 : -1));
