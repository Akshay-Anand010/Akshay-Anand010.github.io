"""
Look up a question that is not about Akshay.

This is the LangChain step. A tool fetches a few public search results.
The website shows those results. It also offers a normal browser link,
so the visitor can open the same search themselves.

Nothing here is a fact about Akshay. Call it only after route.classify
returns "general".
"""

from __future__ import annotations

from urllib.parse import quote_plus


def browser_url(question: str) -> str:
    """A Google search the visitor can open. The page shows this as a link."""
    return "https://www.google.com/search?q=" + quote_plus(question)


def _clean(item: dict) -> dict | None:
    """LangChain and the search package use different key names. Keep three."""
    title = (item.get("title") or "").strip()
    url = (item.get("link") or item.get("href") or item.get("url") or "").strip()
    snippet = (item.get("snippet") or item.get("body") or "").strip()
    if not url:
        return None
    return {"title": title or url, "url": url, "snippet": snippet}


def _from_langchain(question: str) -> list[dict]:
    """The tool from the LangChain material: give it a query, it returns hits.

    DuckDuckGo is the free search behind the tool. No API key, which keeps
    the Space on the free tier. output_format list is easier to show on the page
    than one long string.
    """
    from langchain_community.tools import DuckDuckGoSearchResults

    tool = DuckDuckGoSearchResults(num_results=4, output_format="list")
    raw = tool.invoke(question)
    if isinstance(raw, str):
        return []
    cleaned = []
    for item in raw:
        if isinstance(item, dict):
            hit = _clean(item)
            if hit:
                cleaned.append(hit)
    return cleaned


def _from_ddgs(question: str) -> list[dict]:
    """Same search if the LangChain wrapper cannot import its client."""
    from ddgs import DDGS

    cleaned = []
    for item in DDGS().text(question, max_results=4):
        hit = _clean(item)
        if hit:
            cleaned.append(hit)
    return cleaned


def search(question: str) -> list[dict]:
    """Up to four results. An empty list means the lookup failed, not that the question was bad."""
    try:
        hits = _from_langchain(question)
        if hits:
            return hits
    except Exception:
        pass
    try:
        return _from_ddgs(question)
    except Exception:
        return []
