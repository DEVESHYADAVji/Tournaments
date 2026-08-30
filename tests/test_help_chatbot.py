import importlib


chatbot_module = importlib.import_module("services.ai-helpchat.chatbot")
knowledge_module = importlib.import_module("services.ai-helpchat.knowledge")


def test_help_knowledge_base_uses_markdown():
    chatbot_module.ensure_help_document_loaded()
    assert chatbot_module.HELP_KNOWLEDGE_PATH.name == "Help&Support.md"
    content = chatbot_module.DOCUMENT_CONTEXT.lower()
    assert "tournament" in content
    assert "password hash" not in content
    assert "api key" not in content
    assert "security token" not in content


def test_retrieval_prefers_relevant_help_sections():
    chunks = knowledge_module.chunk_text(
        """# Teams\n\nUsers can create teams and invite players.\n\n# Payments\n\nPayment failures should be checked through the official checkout flow.\n\n# Matches\n\nAdmins can record match results."""
    )
    results = knowledge_module.find_relevant_chunks("How do I invite a player to my team?", chunks)
    assert results
    assert "invite players" in results[0].lower()


def test_empty_document_context_is_safe():
    context = knowledge_module.KnowledgeContext(document="", database="live tournament data")
    assert "live tournament data" in context.combined


def test_chat_request_accepts_limited_history():
    request = chatbot_module.ChatRequest(
        question="Explain that",
        role="user",
        user_id=1,
        history=[{"role": "user", "content": "How do I join?"}],
    )
    assert len(request.history) == 1
    assert request.history[0].content == "How do I join?"
