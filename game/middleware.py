"""
Custom middleware for Keystroke Kingdom.
"""

class DisableCSPMiddleware:
    """
    Middleware to completely remove Content Security Policy headers.
    CSP is controlled by meta tag in HTML instead.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Aggressively remove ALL CSP-related headers
        # Don't set new ones - let HTML meta tag control CSP
        csp_headers = [
            'Content-Security-Policy',
            'Content-Security-Policy-Report-Only',
            'X-Content-Security-Policy',
            'X-WebKit-CSP',
        ]

        for header in csp_headers:
            if header in response:
                del response[header]

        return response
