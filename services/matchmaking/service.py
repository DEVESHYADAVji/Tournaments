from typing import Tuple


def expected_score(rating_a: float, rating_b: float) -> float:
	"""Calculate expected score for player A against player B using ELO formula."""
	qa = 10 ** (rating_a / 400)
	qb = 10 ** (rating_b / 400)
	return qa / (qa + qb)


def update_elo(rating_a: float, rating_b: float, score_a: float, k: int = 32) -> Tuple[float, float]:
	"""Update ELO ratings after a match.

	rating_a, rating_b: current ratings
	score_a: actual score for A (1.0 win, 0.5 draw, 0.0 loss)
	k: K-factor

	Returns: (new_rating_a, new_rating_b)
	"""
	ea = expected_score(rating_a, rating_b)
	eb = expected_score(rating_b, rating_a)

	new_a = rating_a + k * (score_a - ea)
	# score for B is 1 - score_a
	new_b = rating_b + k * ((1 - score_a) - eb)

	return round(new_a, 2), round(new_b, 2)


def record_result(player_a_id: str, player_b_id: str, rating_a: float, rating_b: float, result: str) -> dict:
	"""Record a result between two players and return updated ratings and metadata.

	result: 'a', 'b', or 'draw' indicating winner
	"""
	if result == 'a':
		score_a = 1.0
	elif result == 'b':
		score_a = 0.0
	else:
		score_a = 0.5

	new_a, new_b = update_elo(rating_a, rating_b, score_a)

	return {
		'player_a_id': player_a_id,
		'player_b_id': player_b_id,
		'old_rating_a': rating_a,
		'old_rating_b': rating_b,
		'new_rating_a': new_a,
		'new_rating_b': new_b,
		'result': result,
	}


if __name__ == '__main__':
	# Quick sanity test
	ra, rb = 1600, 1500
	print('Expected A vs B:', expected_score(ra, rb))
	print('After A wins:', update_elo(ra, rb, 1.0))

