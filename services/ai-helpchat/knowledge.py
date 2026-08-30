from __future__ import annotations

import difflib
import re
from dataclasses import dataclass

from ..settings import settings

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from",
    "how", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this",
    "to", "was", "what", "when", "where", "which", "who", "why", "with", "you",
    "your", "okay", "ok", "please", "pls", "can", "could", "would", "me",
}


def normalize_text(text: str) -> list[str]:
    tokens: list[str] = []
    for token in re.findall(r"[a-z0-9]{2,}", text.lower()):
        if token in STOP_WORDS:
            continue
        if len(token) > 5 and token.endswith("ing"):
            token = token[:-3]
        elif len(token) > 4 and token.endswith("ed"):
            token = token[:-2]
        elif len(token) > 4 and token.endswith("es"):
            token = token[:-2]
        elif len(token) > 3 and token.endswith("s"):
            token = token[:-1]
        tokens.append(token)
    return tokens


def chunk_text(text: str, chunk_size: int = 1400) -> list[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for paragraph in paragraphs:
        next_size = size + len(paragraph) + (2 if current else 0)
        if current and next_size > chunk_size:
            chunks.append("\n\n".join(current))
            current = [paragraph]
            size = len(paragraph)
        else:
            current.append(paragraph)
            size = next_size
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def _score_chunk(query: str, chunk: str, vocabulary: set[str]) -> float:
    query_terms = set(normalize_text(query))
    if not query_terms:
        return 0.0
    expanded = set(query_terms)
    for term in query_terms:
        expanded.update(difflib.get_close_matches(term, vocabulary, n=2, cutoff=0.82))
    chunk_terms = set(normalize_text(chunk))
    overlap = expanded & chunk_terms
    if not overlap:
        return 0.0
    normalized_query = " ".join(normalize_text(query))
    normalized_chunk = " ".join(normalize_text(chunk))
    overlap_ratio = len(overlap) / max(len(expanded), 1)
    density = len(overlap) / max(len(chunk_terms), 1)
    phrase_bonus = 0.3 if normalized_query and normalized_query in normalized_chunk else 0.0
    return overlap_ratio * 0.7 + density * 0.1 + phrase_bonus


def find_relevant_chunks(query: str, chunks: list[str], max_chunks: int = 4) -> list[str]:
    if not chunks:
        return []
    vocabulary = {term for chunk in chunks for term in normalize_text(chunk)}
    scored = sorted(((_score_chunk(query, chunk, vocabulary), chunk) for chunk in chunks), reverse=True)
    return [chunk for score, chunk in scored[:max_chunks] if score >= settings.help_chatbot_min_relevance]


def find_related_document_chunks(queries: list[str], chunks: list[str], max_chunks: int = 4) -> list[str]:
    selected: list[str] = []
    seen: set[str] = set()
    for query in queries:
        for chunk in find_relevant_chunks(query, chunks, max_chunks=max_chunks):
            if chunk not in seen:
                selected.append(chunk)
                seen.add(chunk)
    return selected[:max_chunks]


@dataclass(frozen=True)
class KnowledgeContext:
    document: str = ""
    database: str = ""

    @property
    def combined(self) -> str:
        sections: list[str] = []
        if self.document:
            sections.append("HELP DOCUMENT:\n" + self.document)
        if self.database:
            sections.append("CURRENT PUBLIC DATABASE DATA:\n" + self.database)
        return "\n\n".join(sections)


async def build_knowledge_context(
    document_text: str,
    database_snapshot: str,
    question: str,
    retrieval_queries: list[str] | None = None,
) -> KnowledgeContext:
    chunks = chunk_text(document_text)
    queries = [question, *(retrieval_queries or [])]
    queries = [query.strip() for query in queries if query and query.strip()]
    selected = find_related_document_chunks(queries, chunks) if queries else chunks[:3]
    return KnowledgeContext(document="\n\n".join(selected), database=database_snapshot)
