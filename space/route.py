"""
Decide what kind of question a visitor asked.

The personal model only knows the notes in data/life. This file keeps
three paths apart so a coding question is not answered with a job
description, and a missing fact about Akshay is not filled in from the web.

- about: a note matches. The adapted model should answer from that note.
- unknown: the question is about Akshay, and no note covers it.
  Say so. Do not browse, and do not guess.
- general: the question is not about Akshay. The caller may answer it
  and look it up, and should say that this was not the point of the model.
"""

from __future__ import annotations

import re

# Glue words. They match almost every note, so they are not evidence.
STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "what", "who", "where",
    "when", "why", "how", "do", "does", "did", "you", "your", "about",
    "tell", "me", "of", "to", "in", "on", "for", "and", "or", "please",
    "can", "could", "should", "i", "know", "he", "his", "him", "she",
}

# If one of these shows up, the visitor is asking about Akshay even when
# the rest of the sentence is short ("does he drink", "parents").
PERSONAL_MARKERS = {
    "akshay", "visa", "thoughtworks", "manhattan", "patna", "bihar",
    "sarita", "naulis", "chess", "volleyball", "girlfriend", "marriage",
    "married", "drink", "drinks", "drinking", "munnar", "coorg", "ooty",
    "kerala", "karnataka", "iiith", "iiit", "bnm", "oauth", "infoblox",
    "exposys", "hackathon", "bengaluru", "bangalore", "parents", "mother",
    "father", "birthplace", "born", "single",
}

# These words appear in the career notes and also in ordinary technical
# questions. "What is Java?" should not become a paragraph about Visa.
GENERIC_OVERLAP = {
    "java", "python", "sql", "aws", "docker", "kafka", "code", "program",
    "ai", "ml", "learning", "software", "engineer", "work", "project",
    "projects", "data", "model", "system", "systems", "api",
}

# A request to produce something, not a question about a person.
TASK_PHRASES = (
    "write a",
    "write me",
    "write python",
    "python program",
    "program to",
    "code to",
    "script to",
    "function to",
    "algorithm to",
    "sum of two",
)


def words(text: str) -> set[str]:
    """Lowercase words with the glue words removed."""
    found = set(re.findall(r"[a-z0-9]+", text.lower()))
    return {word for word in found - STOPWORDS if len(word) > 1}


def best_note(question: str, notes: list[dict]) -> tuple[dict | None, int, set[str]]:
    """Return the closest note, how many words matched, and which words.

    The name Akshay is in every note, so it is not used as a match.
    A question that is only his name uses the profile note.
    """
    asked = words(question) - {"akshay"}
    if not asked:
        if "akshay" in question.lower():
            profile = next((note for note in notes if note.get("source") == "profile.md"), None)
            if profile:
                return profile, 1, set()
        return None, 0, set()
    winner = None
    winner_score = 0
    winner_overlap: set[str] = set()
    for note in notes:
        haystack = words(f"{note['title']} {note['section']} {note['body']}") - {"akshay"}
        overlap = asked & haystack
        if len(overlap) > winner_score:
            winner = note
            winner_score = len(overlap)
            winner_overlap = overlap
    return winner, winner_score, winner_overlap


def classify(question: str, notes: list[dict]) -> tuple[str, dict | None]:
    """Pick about, unknown, or general. See the module note for what each means."""
    lowered = question.lower()
    asked = words(question)
    note, score, overlap = best_note(question, notes)
    about_him = bool(asked & PERSONAL_MARKERS) or "akshay" in lowered
    general_task = any(phrase in lowered for phrase in TASK_PHRASES)
    specific_overlap = overlap - GENERIC_OVERLAP

    # "Write a Python program" can share a word with a job note.
    # That is still a general request unless it is actually about him.
    if general_task and not about_him:
        return "general", None

    # A question that names him can match on an ordinary word such as "work".
    # A question that does not name him must match a distinctive word,
    # so "What is Java?" does not turn into a job history.
    if about_him and score >= 1 and note is not None:
        return "about", note
    if specific_overlap and score >= 2:
        return "about", note
    if specific_overlap & PERSONAL_MARKERS:
        return "about", note

    if about_him:
        return "unknown", None
    return "general", None
