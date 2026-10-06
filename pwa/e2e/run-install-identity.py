"""Production acceptance only; no Docker, publication, deployment or live API calls."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = ROOT / "pwa/src/lib/server/release-channel.json"
OUTPUT = ROOT / ".task/identity-T4/production-matrix"


def source_identity():
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
    ).decode().split("\0")
    digest = hashlib.sha256()
    for name in sorted(set(paths)):
        if name and (name.startswith("pwa/") or name == "Taskfile.yml"):
            path = ROOT / name
            digest.update(name.encode() + b"\0")
            digest.update(path.read_bytes() if path.is_file() else b"<absent>")
    # Hash local build inputs without logging configuration values.
    for name in ("pwa/.env", "pwa/.env.local", "pwa/.env.production", "pwa/.env.production.local"):
        path = ROOT / name
        if path.is_file():
            digest.update(name.encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    original = ARTIFACT.read_bytes()
    revision = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    cases = [
        (channel, demo, pdf)
        for channel in ("stable", "beta")
        for demo in ("false", "true")
        for pdf in ("off", "on")
    ] + [(channel, "invalid", "off") for channel in ("stable", "beta")]
    records = [
        {"channel": channel, "demo": demo, "pdf": pdf, "status": "not-run"}
        for channel, demo, pdf in cases
    ]
    expected_artifact = original
    try:
        for index, record in enumerate(records):
            if ARTIFACT.read_bytes() != expected_artifact:
                raise RuntimeError("Channel artifact changed concurrently; stop without overwriting it")
            expected_artifact = (json.dumps({"channel": record["channel"]}) + "\n").encode()
            ARTIFACT.write_bytes(expected_artifact)
            env = {key: value for key, value in os.environ.items()
                   if not key.startswith("WFS_FEATURE_") and key != "BASE_URL"}
            # Build with opposite demo/PDF values: a static build-time read must fail.
            env.update({
                "CI": "true",
                "NEXT_PUBLIC_ENVIRONMENT": "test",
                "NEXT_PUBLIC_API_BASE_URL": "",
                "API_INTERNAL_URL": "http://127.0.0.1:9",
                "DEMO_MODE": "false" if record["demo"] == "true" else "true",
                "WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT": "off" if record["pdf"] == "on" else "on",
                "WFS_IDENTITY_TEST_DEMO_MODE": record["demo"],
                "WFS_IDENTITY_TEST_PDF_MODE": record["pdf"],
                "WFS_RELEASE_CHANNEL": "beta" if record["channel"] == "stable" else "stable",
            })
            command = ["task", "test:e2e:ci", "--",
                       "--config=e2e/install-identity.playwright.config.ts"]
            label = f'{index + 1:02}-{record["channel"]}-{record["demo"]}-{record["pdf"]}'
            print(f"Production matrix: {label}", flush=True)
            record.update({"revision": revision, "command": command,
                           "channel_artifact_sha256": hashlib.sha256(expected_artifact).hexdigest(),
                           "source_sha256": source_identity(), "image_id": None})
            log = OUTPUT / f"{label}.log"
            with log.open("w") as stream:
                result = subprocess.run(command, cwd=ROOT, env=env, stdout=stream,
                                        stderr=subprocess.STDOUT)
            record["exit_code"] = result.returncode
            output = log.read_text()
            record["status"] = "passed" if result.returncode == 0 else "failed"
            if result.returncode and any(message in output for message in (
                "listen EPERM", "EACCES", "Failed to fetch", "unable to get local issuer certificate",
                "Operation not permitted (os error 1)"
            )):
                record["status"] = "blocked"
            if source_identity() != record["source_sha256"]:
                record["status"] = "failed"
                record["detail"] = "Source/configuration mutated during verification"
                result = subprocess.CompletedProcess(command, 1)
            if result.returncode == 0:
                record["build_id"] = (ROOT / "pwa/.next/BUILD_ID").read_text().strip()
            (OUTPUT / "results.json").write_text(json.dumps(records, indent=2) + "\n")
            print(output[-4000:], flush=True)
            if result.returncode:
                return result.returncode
        return 0
    finally:
        if ARTIFACT.read_bytes() == expected_artifact:
            ARTIFACT.write_bytes(original)
        else:
            raise RuntimeError("Concurrent channel edit retained; original bytes not restored")


if __name__ == "__main__":
    raise SystemExit(main())
