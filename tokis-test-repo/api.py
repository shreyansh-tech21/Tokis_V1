from rateLimiter import rate_limiter

def login(request_count):
    result = rate_limiter(request_count)
    if result == "Too many requests":
        return "Blocked"
    return "Login success"