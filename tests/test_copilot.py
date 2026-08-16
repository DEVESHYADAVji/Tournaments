from app.api.ai.copilot_routes import TournamentDraft


def test_tournament_copilot_draft_validation():
    draft = TournamentDraft(
        name="Test Cup",
        game="Valorant",
        format="Double Elimination",
        max_teams=32,
        prize_pool=1000,
    )
    assert draft.max_teams == 32
    assert draft.format == "Double Elimination"
