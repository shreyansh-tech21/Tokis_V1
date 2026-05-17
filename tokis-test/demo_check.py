"""Run from tokis-test/: python demo_check.py — shows bugs before Tokis/ChatGPT fixes."""

from __future__ import annotations

import sys


def test_calculator_java_note() -> None:
    print("Calculator.java (compile & run separately):")
    print("  divide(10, 0)  → ArithmeticException")
    print("  greet(null)    → NullPointerException")
    print()


def test_helper() -> None:
    print("helper.py:")
    from src.helper import average, find_user

    users = [{"id": 1, "name": "Ada"}]
    print("  find_user(users, 1) =>", find_user(users, 1))
    print("  average([2, 4, 6])  =>", average([2, 4, 6]))
    print("  average([])         =>", end=" ")
    try:
        print(average([]))
    except ZeroDivisionError as e:
        print(f"ZeroDivisionError ({e})")


if __name__ == "__main__":
    test_calculator_java_note()
    try:
        test_helper()
    except SyntaxError as e:
        print(f"helper.py does not import — SyntaxError: {e}")
        print("Fix find_user (use ==) before other tests pass.")
        sys.exit(1)
