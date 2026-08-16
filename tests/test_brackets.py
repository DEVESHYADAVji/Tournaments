from app.services.brackets import generate_bracket, generate_double_elimination, generate_round_robin, generate_single_elimination


def test_single_elimination_has_power_of_two_first_round():
    slots = generate_single_elimination(["A", "B", "C", "D", "E"])
    assert [(slot.team_a, slot.team_b) for slot in slots[:4]] == [("A", "B"), ("C", "D"), ("E", None), (None, None)]
    assert slots[-1].round_name == "Final"


def test_round_robin_contains_each_pair_once():
    slots = generate_round_robin(["A", "B", "C", "D"])
    pairs = {frozenset((slot.team_a, slot.team_b)) for slot in slots}
    assert len(slots) == 6
    assert len(pairs) == 6


def test_double_elimination_has_loser_bracket_and_grand_final():
    slots = generate_double_elimination(["A", "B", "C", "D"])
    assert any(slot.bracket == "losers" for slot in slots)
    assert any(slot.round_name == "Grand Final" for slot in slots)


def test_swiss_first_round_pairs_participants_once():
    slots = generate_bracket("Swiss", ["A", "B", "C", "D", "E"])
    assert [(slot.team_a, slot.team_b) for slot in slots] == [("A", "B"), ("C", "D"), ("E", None)]


def test_bracket_rejects_invalid_input():
    try:
        generate_bracket("Single Elimination", ["A"])
    except ValueError as exc:
        assert "At least two teams" in str(exc)
    else:
        raise AssertionError("Expected invalid team count to fail")
