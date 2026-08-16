import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")


def test_integration_routes_import():
    from app.api.integrations.integration_routes import router

    paths = {route.path for route in router.routes}
    assert "/integrations/health" in paths
    assert "/integrations/oauth/{provider}" in paths
    assert "/integrations/discord/announce" in paths
    assert "/integrations/ai/insights" in paths
    assert "/integrations/ai/recap" in paths
    assert "/integrations/ai/social" in paths
    assert "/integrations/moderation/reports" in paths


def test_integration_settings_are_optional():
    from app.core.config import settings

    assert hasattr(settings, "GOOGLE_CLIENT_ID")
    assert hasattr(settings, "FACEBOOK_APP_ID")
    assert hasattr(settings, "DISCORD_BOT_TOKEN")
    assert hasattr(settings, "STREAM_PROVIDER")
