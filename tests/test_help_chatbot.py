import importlib


chatbot_module = importlib.import_module("services.ai-helpchat.chatbot")

HELP_KNOWLEDGE_PATH = chatbot_module.HELP_KNOWLEDGE_PATH
ensure_help_document_loaded = chatbot_module.ensure_help_document_loaded


def test_help_knowledge_base_uses_markdown_and_not_pdf():
    ensure_help_document_loaded(force_reload=True)

    assert HELP_KNOWLEDGE_PATH.name.endswith(".md")
    assert "Help&Support.pdf" not in HELP_KNOWLEDGE_PATH.name
    content = chatbot_module.DOCUMENT_CONTEXT.lower()
    assert "tournament" in content
    assert "password hash" not in content
    assert "api key" not in content
    assert "security token" not in content


def test_role_aware_permission_and_human_formatting_helpers():
    assert chatbot_module.is_admin_creation_question("how can i create a tournament") is True
    assert chatbot_module.is_admin_creation_question("how do i join a tournament") is False

    formatted = chatbot_module.clean_markdown_response("**Step 1**: Go to the page.\n\n2. Click create.")
    assert "**" not in formatted
    assert "Step 1" in formatted
    assert "Click create" in formatted
