#!/usr/bin/env python3
"""Privacy-safe synthetic probe for a preconfigured non-production search cohort."""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def probe(base_url: str, token: str | None, expected_path: str) -> dict[str, object]:
    body = json.dumps({"query": "synthetic recipe search probe", "limit": 1}).encode()
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/recipes/search",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.load(response)
        elapsed_ms = round((time.monotonic() - started) * 1000)
        data = payload.get("data", payload)
        actual_path = data.get("resultPath")
        return {"status": "passed" if actual_path == expected_path else "failed", "httpStatus": response.status, "resultPath": actual_path, "durationMs": elapsed_ms}
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        return {"status": "failed", "errorType": type(error).__name__}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a synthetic recipe-search probe without logging request content.")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--expected-path", choices=["lexical-only", "hybrid"], required=True)
    parser.add_argument("--token")
    args = parser.parse_args()
    result = probe(args.base_url, args.token, args.expected_path)
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
