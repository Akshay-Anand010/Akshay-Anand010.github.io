import { addSource, readSources } from "./fetch-posts.mjs";

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Desk</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #f3f4f6;
      background-image:
        linear-gradient(to right, rgba(17,17,17,.045) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(17,17,17,.045) 1px, transparent 1px);
      background-size: 32px 32px;
      color: #111;
      font-family: "Inter Tight", sans-serif;
    }
    main { width: min(720px, calc(100% - 2rem)); margin: 3rem auto 4rem; }
    p { color: #6b7280; }
    h1 { margin: 0 0 .4rem; font-size: 2.4rem; letter-spacing: -.04em; }
    form, .list, .status {
      background: #fff;
      border: 1px solid #e6e7eb;
      padding: 1rem;
    }
    form { display: flex; gap: .5rem; }
    input {
      flex: 1;
      border: 1px solid #e6e7eb;
      padding: .7rem .8rem;
      font: inherit;
      outline: none;
    }
    input:focus { border-color: #111; }
    button {
      border: 0;
      background: #f5c518;
      color: #111;
      padding: .7rem 1rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .list { margin-top: 1rem; }
    a { color: inherit; }
    li { padding: .7rem 0; border-top: 1px solid #e6e7eb; }
    li span, .status { display: block; color: #6b7280; font-family: "JetBrains Mono", monospace; font-size: .78rem; }
    .status { margin-top: 1rem; }
    .bad { color: #e8590c; }
  </style>
</head>
<body>
  <main>
    <h1>Desk</h1>
    <p>Paste a Medium or Hashnode link. The story is saved into the blog and rendered in the site theme. This page only exists on your machine.</p>
    <form>
      <input name="url" type="url" required placeholder="https://medium.com/@you/story or https://you.hashnode.dev/story" />
      <button type="submit">Add</button>
    </form>
    <div class="status" hidden></div>
    <div class="list"></div>
  </main>
  <script>
    const status = document.querySelector(".status");
    const list = document.querySelector(".list");
    function show(text, bad) {
      status.hidden = false;
      status.className = bad ? "status bad" : "status";
      status.textContent = text;
    }
    async function load() {
      const sources = await fetch("/desk/sources").then((response) => response.json());
      list.innerHTML = sources.length
        ? "<ul>" + sources.map((url) => "<li><a href='" + url + "'>" + url + "</a></li>").join("") + "</ul>"
        : "<p>No links yet.</p>";
    }
    document.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = new FormData(event.target).get("url");
      show("Fetching the story…");
      const response = await fetch("/desk/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();
      if (!response.ok) {
        show(result.message || "That link did not import.", true);
        return;
      }
      const titles = result.written.map((post) => post.title).join(", ");
      const problems = result.errors.map((error) => error.message).join(" ");
      show(problems ? problems : "Saved. " + titles, Boolean(problems && !result.written.length));
      event.target.reset();
      load();
    });
    load();
  </script>
</body>
</html>`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, body, type) {
  res.statusCode = status;
  res.setHeader("content-type", type);
  res.end(body);
}

export function desk() {
  return {
    name: "desk",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || "").split("?")[0];
        if (pathname === "/desk" && req.method === "GET") {
          send(res, 200, page, "text/html; charset=utf-8");
          return;
        }
        if (pathname === "/desk/sources" && req.method === "GET") {
          send(res, 200, JSON.stringify(await readSources()), "application/json");
          return;
        }
        if (pathname === "/desk/add" && req.method === "POST") {
          try {
            const payload = JSON.parse(await readBody(req));
            const result = await addSource(payload.url || "");
            send(res, result.errors.length && !result.written.length ? 422 : 200, JSON.stringify(result), "application/json");
          } catch (error) {
            send(res, 400, JSON.stringify({ message: error.message }), "application/json");
          }
          return;
        }
        next();
      });
    },
  };
}
