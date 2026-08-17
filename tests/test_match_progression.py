from app.models.match import Match


def test_match_supports_bracket_progression_fields():
    assert Match.bracket_match_number is not None
    assert Match.next_match_id is not None
