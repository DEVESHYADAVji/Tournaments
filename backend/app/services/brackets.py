"""Deterministic tournament scheduling primitives.

This module contains no persistence or framework code. It turns an ordered list of
team names into match slots for the supported tournament formats so that bracket
rules remain testable independently from HTTP/database concerns.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import log2
from typing import Sequence

SUPPORTED_FORMATS = {
    "single elimination",
    "double elimination",
    "round robin",
}


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
    """Create the first playable round plus future placeholder slots."""

    normalized = _validate_teams(teams)
    size = _next_power_of_two(len(normalized))
    total_rounds = int(log2(size))
    seeded = normalized + [None] * (size - len(normalized))
    slots: list[MatchSlot] = []
    match_number = 1

    for index in range(0, size, 2):
        slots.append(
            MatchSlot(
                round_name=_round_label(0, total_rounds),
                match_number=match_number,
                team_a=seeded[index],
                team_b=seeded[index + 1],
            )
        )
        match_number += 1

    for round_index in range(1, total_rounds):
        matches_in_round = size // (2 ** (round_index + 1))
        for _ in range(matches_in_round):
            slots.append(
                MatchSlot(
                    round_name=_round_label(round_index, total_rounds),
                    match_number=match_number,
                    team_a=None,
                    team_b=None,
                )
            )
            match_number += 1

    return slots


def generate_double_elimination(teams: Sequence[str]) -> list[MatchSlot]:
    """Create a deterministic main bracket and loser-bracket schedule skeleton."""

    winners = generate_single_elimination(teams)
    size = _next_power_of_two(len(_validate_teams(teams)))
    winners_rounds = int(log2(size))
    losers_slots: list[MatchSlot] = []
    match_number = len(winners) + 1

    for round_index in range(max(1, 2 * (winners_rounds - 1))):
        matches_in_round = max(1, size // (2 ** ((round_index // 2) + 2)))
        for _ in range(matches_in_round):
            losers_slots.append(
                MatchSlot(
                    round_name=f"Losers Round {round_index + 1}",
                    match_number=match_number,
                    team_a=None,
                    team_b=None,
                    bracket="losers",
                )
            )
            match_number += 1

    winners.append(
        MatchSlot(
            round_name="Grand Final",
            match_number=match_number,
            team_a=None,
            team_b=None,
            bracket="grand_final",
        )
    )
    return winners + losers_slots


def generate_round_robin(teams: Sequence[str]) -> list[MatchSlot]:
    """Create every unique pair once using the circle-method schedule."""

    normalized = _validate_teams(teams)
    working = list(normalized)
    if len(working) % 2:
        working.append(None)  # type: ignore[arg-type]

    slots: list[MatchSlot] = []
    rounds = len(working) - 1
    match_number = 1

    for round_index in range(rounds):
        for index in range(len(working) // 2):
            team_a = working[index]
            team_b = working[-index - 1]
            if team_a is not None and team_b is not None:
                slots.append(
                    MatchSlot(
                        round_name=f"Round {round_index + 1}",
                        match_number=match_number,
                        team_a=team_a,
                        team_b=team_b,
                    )
                )
                match_number += 1
        working = [working[0], working[-1], *working[1:-1]]

    return slots


def generate_bracket(format_name: str, teams: Sequence[str]) -> list[MatchSlot]:
    """Generate a supported tournament schedule skeleton."""

    key = format_name.strip().lower()
    if key == "single elimination":
        return generate_single_elimination(teams)
    if key == "double elimination":
        return generate_double_elimination(teams)
    if key == "round robin":
        return generate_round_robin(teams)
    raise ValueError(f"Unsupported tournament format: {format_name}")
