// Turns the links in sources.txt into themed posts under web/posts.
// Medium and Hashnode. Run from web/: node fetch-posts.mjs

import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const sourcesPath = path.join(root, "sources.txt");
const postsDir = path.join(root, "posts");
const headers = { "User-Agent": "Mozilla/5.0 akshay-site" };

function unwrap(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function field(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return match ? unwrap(match[1]) : "";
}

function items(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
}

function slugFrom(link) {
  const leaf = link.split("?")[0].split("/").filter(Boolean).pop() || "post";
  return leaf.replace(/-[0-9a-f]{10,}$/i, "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function isoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function summary(html) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 150).replace(/\s+\S*$/, "");
}

function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, "")
    .replace(/<h([23])>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").replace(/^[^\p{L}\p{N}]+/u, "");
      return `<h${level}>${text.trim()}</h${level}>`;
    })
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, inner) => {
      const code = inner
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?code>/gi, "")
        .replace(/^\n+|\n+$/g, "");
      return `<pre><code>${code}</code></pre>`;
    })
    .trim();
}

function quote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function storyFromItem(item, prefix) {
  const link = field(item, "link").split("?")[0];
  const html = clean(field(item, "content:encoded") || field(item, "description"));
  return {
    prefix,
    slug: slugFrom(link),
    title: field(item, "title"),
    date: isoDate(field(item, "pubDate")),
    summary: summary(html),
    source: link,
    html,
  };
}

async function text(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

async function medium(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.find((part) => part.startsWith("@"));
  if (!at) throw new Error("Use a medium.com/@name link.");
  const feed = await text(`https://medium.com/feed/${at}`);
  const stories = items(feed).map((item) => storyFromItem(item, "medium"));
  const article = parts.length > parts.indexOf(at) + 1;
  if (!article) return stories;
  const wanted = slugFrom(url.href);
  const match = stories.find((story) => story.slug === wanted || story.source.includes(wanted));
  if (!match) throw new Error("That Medium story is not in the public feed.");
  return [match];
}

async function hashnode(url) {
  const host = url.hostname.replace(/^www\./, "");
  const slug = url.pathname.split("/").filter(Boolean)[0] || "";
  const feed = await text(`https://${host}/rss.xml`);
  const stories = items(feed).map((item) => storyFromItem(item, "hashnode"));
  if (!slug || ["rss", "rss.xml", "archive", "newsletter"].includes(slug)) return stories;
  const wanted = slugFrom(slug);
  const match = stories.find((story) => story.slug === wanted || story.source.includes(wanted));
  if (!match) throw new Error("That story is not in the public feed. Paste the blog home to import every story.");
  return [match];
}

export async function storiesFor(raw) {
  const url = new URL(raw);
  const host = url.hostname.replace(/^www\./, "");
  if (host === "medium.com" || host.endsWith(".medium.com")) return medium(url);
  if (host.endsWith("hashnode.dev") || host === "hashnode.com") return hashnode(url);
  return hashnode(url);
}

function fileFor(story) {
  return `---
title: ${quote(story.title)}
date: ${story.date}
summary: ${quote(story.summary)}
source: ${story.source}
format: html
---
${story.html}
`;
}

export async function readSources() {
  try {
    const raw = await readFile(sourcesPath, "utf8");
    return raw.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

export async function addSource(raw) {
  let url;
  try {
    url = new URL(String(raw).trim()).href;
  } catch {
    throw new Error("That is not a link.");
  }
  const current = await readSources();
  const key = url.replace(/\/$/, "");
  const exists = current.some((item) => item.replace(/\/$/, "") === key);
  if (!exists) {
    await storiesFor(url);
    let file = "";
    try {
      file = await readFile(sourcesPath, "utf8");
    } catch {
      file = "";
    }
    const next = file.trim() ? `${file.replace(/\s*$/, "")}\n${url}\n` : `${url}\n`;
    await writeFile(sourcesPath, next);
  }
  return importSources();
}

export async function importSources() {
  const links = await readSources();
  const stories = [];
  const errors = [];
  for (const link of links) {
    try {
      stories.push(...await storiesFor(link));
    } catch (error) {
      errors.push({ link, message: error.message });
    }
  }
  if (!stories.length) return { written: [], errors };
  await mkdir(postsDir, { recursive: true });
  const names = new Set();
  const written = [];
  for (const story of stories) {
    const name = `${story.prefix}-${story.slug}.md`;
    names.add(name);
    await writeFile(path.join(postsDir, name), fileFor(story));
    written.push({ file: name, title: story.title, source: story.source });
  }
  for (const name of await readdir(postsDir)) {
    if (/^(medium|hashnode)-/.test(name) && name.endsWith(".md") && !names.has(name)) {
      await unlink(path.join(postsDir, name));
    }
  }
  return { written, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await importSources();
  for (const post of result.written) console.log(post.file);
  for (const error of result.errors) console.error(`${error.link}\n  ${error.message}`);
  if (!result.written.length && result.errors.length) process.exitCode = 1;
}
