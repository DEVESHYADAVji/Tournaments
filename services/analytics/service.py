from datetime import datetime
from typing import Dict, List, Optional, Tuple


def _expected_score(rating_a: float, rating_b: float) -> float:
	"""Compute expected probability of A beating B using ELO formula."""
	qa = 10 ** (rating_a / 400)
	qb = 10 ** (rating_b / 400)
	return qa / (qa + qb)


def predict_match(
	player_a: str,
	player_b: str,
	rating_a: float = 1500.0,
	rating_b: float = 1500.0,
	extra_context: Optional[Dict] = None,
) -> Dict:
	"""Return a mock prediction for a match between two players.

	The prediction includes win probabilities derived from an ELO expected score,
	a predicted_winner, and a simple confidence metric.
	"""
	prob_a = _expected_score(rating_a, rating_b)
	prob_b = 1.0 - prob_a

	# Simple confidence: scaled distance from 0.5 (0..1)
	confidence = abs(prob_a - 0.5) * 2

	predicted_winner = player_a if prob_a >= prob_b else player_b

	result = {
		"timestamp": datetime.utcnow().isoformat(),
		"players": {"a": player_a, "b": player_b},
		"ratings": {"a": rating_a, "b": rating_b},
		"probabilities": {"a": round(prob_a, 3), "b": round(prob_b, 3)},
		"predicted_winner": predicted_winner,
		"confidence": round(confidence, 3),
	}

	if extra_context:
		result["context"] = extra_context

	return result


def batch_predict(matches: List[Dict]) -> List[Dict]:
	"""Accept a list of match descriptors and return predictions.

	Each match descriptor should be a dict with keys: player_a, player_b, rating_a?, rating_b?, context?
	"""
	out = []
	for m in matches:
		pa = m.get("player_a") or m.get("a")
		pb = m.get("player_b") or m.get("b")
		ra = float(m.get("rating_a", m.get("a_rating", 1500)))
		rb = float(m.get("rating_b", m.get("b_rating", 1500)))
		ctx = m.get("context")
		out.append(predict_match(pa, pb, ra, rb, ctx))
	return out


def top_k_favorites(predictions: List[Dict], k: int = 3) -> List[Dict]:
	"""Return top-k predictions sorted by confidence descending."""
	sorted_preds = sorted(predictions, key=lambda p: p.get("confidence", 0), reverse=True)
	return sorted_preds[:k]


if __name__ == "__main__":
	# quick demo
	sample = predict_match("Alice", "Bob", rating_a=1600, rating_b=1450)
	print(sample)
	batch = batch_predict([
		{"player_a": "Alice", "player_b": "Bob", "rating_a": 1600, "rating_b": 1450},
		{"player_a": "Carol", "player_b": "Dave", "rating_a": 1500, "rating_b": 1500},
	])
	print(batch)

