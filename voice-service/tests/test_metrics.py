import pytest

from app.metrics import normalize, word_error_rate


def test_identical_texts_have_zero_error():
    assert word_error_rate("Nanga def, mangi fi rekk.", "nanga def mangi fi rekk") == 0.0


def test_substitution_deletion_insertion_each_count_once():
    assert word_error_rate("a b c d", "a x c d") == pytest.approx(0.25)    # substitution
    assert word_error_rate("a b c d", "a b d") == pytest.approx(0.25)      # suppression
    assert word_error_rate("a b c d", "a b c x d") == pytest.approx(0.25)  # insertion


def test_everything_wrong_and_empty_cases():
    assert word_error_rate("a b", "x y z") == pytest.approx(1.5)           # peut dépasser 100 %
    assert word_error_rate("", "") == 0.0 and word_error_rate("", "x") == 1.0
    assert word_error_rate("a b", "") == 1.0


def test_wolof_accents_are_kept_because_they_change_the_word():
    assert normalize("Ñaar  fukk, juroom-benn !") == ["ñaar", "fukk", "juroom-benn"]
    assert word_error_rate("wér na", "wer na") == pytest.approx(0.5)
