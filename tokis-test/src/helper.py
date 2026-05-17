def average(values):
    """Return average of a list."""
    # Bug: empty list → ZeroDivisionError
    total = 0
    for v in values:
        total += v
    return total / len(values)


def find_user(users, user_id):
    for user in users:
        # Bug: assignment (=) instead of comparison (==) — SyntaxError
        if user["id"] = user_id:
            return user
    return None
