def rate_limiter(request_count):
    if request_count > 100:
        return "Too many requests"
    return "OK"