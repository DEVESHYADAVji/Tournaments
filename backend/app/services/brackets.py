"""Deterministic tournament scheduling primitives."""

from __future__ import annotations

from dataclasses import dataclass
from math import log2
from typing import Sequence

SUPPORTED_FORMATS = {"single elimination", "double elimination", "round robin", "swiss"}


@dataclass(frozen=True)
class MatchSlot:
    round_name: str
    match_number: int
    team_a: str | None
    team_b: str | None
    bracket: str = "main"


def _validate_teams(teams: Sequence[str]) -> list[str]:
    normalized = [team.strip() for team in teams]
    if len(normalized) < 2:
        raise ValueError("At least two teams are required")
    if any(not team for team in normalized):
        raise ValueError("Team names cannot be empty")
    if len(set(normalized)) != len(normalized):
        raise ValueError("Team names must be unique")
    return normalized


def _next_power_of_two(value: int) -> int:
    return 1 << (value - 1).bit_length()


def _round_label(index: int, total_rounds: int) -> str:
    distance = total_rounds - index
    if distance == 1:
        return "Final"
    if distance == 2:
        return "Semifinals"
    if distance == 3:
        return "Quarterfinals"
    return f"Round {index + 1}"


def generate_single_elimination(teams: Sequence[str]) -> list[MatchSlot]:
    normalized = _validate_teams(teams)
    size = _next_power_of_two(len(normalized))
    total_rounds = int(log2(size))
    seeded = normalized + [None] * (size - len(normalized))
    slots: list[MatchSlot] = []
    match_number = 1

    for index in range(0, size, 2):
        slots.append(MatchSlot(_round_label(0, total_rounds), match_number, seeded[index], seeded[index + 1]))
        match_number += 1

    for round_index in range(1, total_rounds):
        for _ in range(size // (2 ** (round_index + 1))):
            slots.append(MatchSlot(_round_label(round_index, total_rounds), match_number, None, None))
            match_number += 1
    return slots


def generate_double_elimination(teams: Sequence[str]) -> list[MatchSlot]:
    normalized = _validate_teams(teams)
    winners = generate_single_elimination(normalized)
    size = _next_power_of_two(len(normalized))
    winners_rounds = int(log2(size))
    losers_slots: list[MatchSlot] = []
    match_number = len(winners) + 1

    for round_index in range(max(1, 2 * (winners_rounds - 1))):
        matches_in_round = max(1, size // (2 ** ((round_index // 2) + 2)))
        for _ in range(matches_in_round):
            losers_slots.append(MatchSlot(f"Losers Round {round_index + 1}", match_number, None, None, "losers"))
            match_number += 1

    winners.append(MatchSlot("Grand Final", match_number, None, None, "grand_final"))
    return winners + losers_slots


def generate_round_robin(teams: Sequence[str]) -> list[MatchSlot]:
    normalized = _validate_teams(teams)
    working: list[str | None] = list(normalized)
    if len(working) % 2:
        working.append(None)

    slots: list[MatchSlot] = []
    match_number = 1
    for round_index in range(len(working) - 1):
        for index in range(len(working) // 2):
            team_a, team_b = working[index], working[-index - 1]
            if team_a is not None and team_b is not None:
                slots.append(MatchSlot(f"Round {round_index + 1}", match_number, team_a, team_b))
                match_number += 1
        working = [working[0], working[-1], *working[1:-1]]
    return slots


def generate_swiss(teams: Sequence[str]) -> list[MatchSlot]:
    """Create a deterministic first Swiss round; later rounds are result-driven."""
    normalized = _validate_teams(teams)
    slots: list[MatchSlot] = []
    match_number = 1
    for index in range(0, len(normalized) - 1, 2):
        slots.append(MatchSlot("Swiss Round 1", match_number, normalized[index], normalized[index + 1]))
        match_number += 1
    if len(normalized) % 2:
        slots.append(MatchSlot("Swiss Round 1", match_number, normalized[-1], None))
    return slots


def generate_bracket(format_name: str, teams: Sequence[str]) -> list[MatchSlot]:
    key = format_name.strip().lower()
    if key == "single elimination":
        return generate_single_elimination(teams)
    if key == "double elimination":
        return generate_double_elimination(teams)
    if key == "round robin":
        return generate_round_robin(teams)
    if key == "swiss":
        return generate_swiss(teams)
    raise ValueError(f"Unsupported tournament format: {format_name}")
