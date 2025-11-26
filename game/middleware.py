"""
Custom middleware for Keystroke Kingdom.
"""

class DisableCSPMiddleware:
    """
    Middleware to disable restrictive Content Security Policy that blocks JavaScript.
    This allows our game's event handlers and inline scripts to work.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Remove any CSP headers that might be blocking JavaScript
        if 'Content-Security-Policy' in response:
            del response['Content-Security-Policy']
        if 'Content-Security-Policy-Report-Only' in response:
            del response['Content-Security-Policy-Report-Only']

        # Set a permissive CSP that allows our JavaScript
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"

        return response
