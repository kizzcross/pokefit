"""Proxy webpack dev assets through Django (same origin as ngrok HTTPS)."""

from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import HttpResponse, HttpResponseNotFound


def webpack_bundles_proxy(request, asset_path: str) -> HttpResponse:
    base = getattr(settings, "WEBPACK_DEV_SERVER", "http://127.0.0.1:3000").rstrip("/")
    upstream = f"{base}/frontend/webpack_bundles/{asset_path}"
    if request.META.get("QUERY_STRING"):
        upstream = f"{upstream}?{request.META['QUERY_STRING']}"

    headers = {}
    if request.META.get("HTTP_IF_NONE_MATCH"):
        headers["If-None-Match"] = request.META["HTTP_IF_NONE_MATCH"]
    if request.META.get("HTTP_IF_MODIFIED_SINCE"):
        headers["If-Modified-Since"] = request.META["HTTP_IF_MODIFIED_SINCE"]

    try:
        upstream_request = Request(upstream, headers=headers)
        with urlopen(upstream_request, timeout=30) as resp:
            content = resp.read()
            response = HttpResponse(content, status=resp.status)
            for header in ("Content-Type", "Content-Length", "ETag", "Last-Modified", "Cache-Control"):
                value = resp.headers.get(header)
                if value:
                    response[header] = value
            return response
    except HTTPError as exc:
        if exc.code == 404:
            return HttpResponseNotFound()
        return HttpResponse(exc.read(), status=exc.code)
    except URLError:
        return HttpResponse(
            "Webpack dev server is not running. Start it with: pnpm run dev",
            status=502,
        )
