import importlib

chatbot_module = importlib.import_module("services.ai-helpchat.chatbot")
knowledge_module = importlib.import_module("services.ai-helpchat.knowledge")


def test_help_knowledge_base_uses_markdown():
    chatbot_module.ensure_help_document_loaded()
    assert chatbot_module.HELP_KNOWLEDGE_PATH.name == "Help&Support.md"
    assert "tournament" in chatbot_module.DOCUMENT_CONTEXT.lower()


def test_retrieval_prefers_relevant_help_sections():
    chunks = knowledge_module.chunk_text("""# Teams\n\nUsers can create teams and invite players.\n\n# Payments\n\nPayment failures should be checked through checkout.\n\n# Matches\n\nAdmins can record match results.""")
    results = knowledge_module.find_relevant_chunks("How do I invite a player to my team?", chunks)
    assert results and "invite players" in results[0].lower()


def test_related_queries_cover_spelling_and_follow_up_topics():
    chunks = knowledge_module.chunk_text("""# Tournaments\n\nUpcoming tournaments are listed on the tournaments page.\n\n# Profile\n\nUsers can change their profile avatar from profile settings.""")
    results = knowledge_module.find_related_document_chunks(["upcomng tournamnet", "change profile picture"], chunks)
    assert len(results) == 2
    assert any("upcoming tournaments" in result.lower() for result in results)
    assert any("profile avatar" in result.lower() for result in results)


def test_user_context_supports_personalized_questions():
    user = chatbot_module.UserContext(id=7, name="Test User", email="test@example.com", role="user")
    request = chatbot_module.ChatRequest(question="Can you tell me my name?", user=user)
    assert request.user is not None and request.user.name == "Test User"


def test_admin_context_is_distinct_from_user_context():
    user = chatbot_module.UserContext(id=9, name="Admin User", role="admin")
    request = chatbot_module.ChatRequest(question="What can I manage?", user=user)
    assert request.user.role == "admin"


def test_chat_request_accepts_limited_history():
    request = chatbot_module.ChatRequest(question="Explain that", history=[{"role": "user", "content": "How do I join?"}])
    assert request.history[0].content == "How do I join?"
