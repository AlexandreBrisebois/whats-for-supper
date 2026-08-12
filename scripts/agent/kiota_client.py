#!/usr/bin/env python3
"""Runtime-safe, non-interactive Kiota generation for the WFS harness."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]
PWA_DIR = ROOT / "pwa"
GENERATED_DIR = PWA_DIR / "src" / "lib" / "api" / "generated"
DEFAULT_TIMEOUT_SECONDS = 20
IGNORED_COMPARISON_FILES = {"kiota-lock.json", ".kiota.log"}


class HarnessTimeoutError(RuntimeError):
    pass


def kiota_version(root: Path = ROOT) -> str:
    manifest = json.loads((root / ".config" / "dotnet-tools.json").read_text())
    return manifest["tools"]["microsoft.openapi.kiota"]["version"]


def resolve_kiota_dll(root: Path = ROOT, nuget_root: Path | None = None) -> Path:
    version = kiota_version(root)
    package_root = nuget_root or Path(
        os.environ.get("NUGET_PACKAGES", Path.home() / ".nuget" / "packages")
    )
    candidates = sorted(
        (package_root / "microsoft.openapi.kiota" / version / "tools").glob(
            "net*/any/kiota.dll"
        )
    )
    if not candidates:
        raise FileNotFoundError(
            f"Kiota {version} is not restored. Run 'dotnet tool restore' and retry."
        )
    return candidates[0]


def build_generate_command(
    *,
    root: Path = ROOT,
    output_dir: Path,
    nuget_root: Path | None = None,
    dotnet_path: str | None = None,
) -> list[str]:
    dotnet = dotnet_path or shutil.which("dotnet")
    if not dotnet:
        raise FileNotFoundError("dotnet is not available on PATH")
    return [
        dotnet,
        str(resolve_kiota_dll(root, nuget_root)),
        "generate",
        "-l",
        "typescript",
        "-c",
        "ApiClient",
        "-o",
        str(output_dir),
        "-d",
        str(root / "specs" / "openapi.yaml"),
        "--clean-output",
    ]


def run_command(
    command: list[str],
    *,
    cwd: Path,
    timeout_seconds: int,
    env: dict[str, str] | None = None,
    stage: str,
    capture_output: bool = False,
) -> None:
    command_env = dict(os.environ if env is None else env)
    command_env.pop("DOTNET_ROLL_FORWARD", None)
    command_env["DOTNET_CLI_TELEMETRY_OPTOUT"] = "1"
    command_env["Update__Disabled"] = "true"
    command_env["Telemetry__OptOut"] = "true"
    command_env["Telemetry__AppInsights__Enabled"] = "false"
    print(f"⏳ {stage} (timeout: {timeout_seconds}s)", flush=True)
    try:
        subprocess.run(
            command,
            cwd=cwd,
            env=command_env,
            stdin=subprocess.DEVNULL,
            check=True,
            timeout=timeout_seconds,
            capture_output=capture_output,
            text=capture_output,
        )
    except subprocess.TimeoutExpired as error:
        raise HarnessTimeoutError(
            f"{stage} exceeded {timeout_seconds}s and was stopped. "
            "No automatic retry was attempted."
        ) from error
    except subprocess.CalledProcessError as error:
        if capture_output:
            if error.stdout:
                print(error.stdout, file=sys.stderr)
            if error.stderr:
                print(error.stderr, file=sys.stderr)
        raise


def post_process(output_dir: Path, timeout_seconds: int) -> None:
    fix_env = dict(os.environ)
    fix_env["KIOTA_TARGET_DIR"] = str(output_dir)
    run_command(
        ["node", "scripts/fix-kiota-imports.js"],
        cwd=PWA_DIR,
        timeout_seconds=timeout_seconds,
        env=fix_env,
        stage="Kiota import post-processing",
        capture_output=True,
    )
    run_command(
        [
            "npx",
            "prettier",
            "--config",
            ".prettierrc.json",
            "--write",
            str(output_dir / "**" / "*.ts"),
        ],
        cwd=PWA_DIR,
        timeout_seconds=timeout_seconds,
        stage="Generated client formatting",
        capture_output=True,
    )


def generated_files(root: Path) -> dict[Path, bytes]:
    return {
        path.relative_to(root): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file() and path.name not in IGNORED_COMPARISON_FILES
    }


def compare_generated_trees(expected: Path, actual: Path) -> list[str]:
    expected_files = generated_files(expected)
    actual_files = generated_files(actual)
    paths = sorted(set(expected_files) | set(actual_files))
    return [str(path) for path in paths if expected_files.get(path) != actual_files.get(path)]


def generate(output_dir: Path, timeout_seconds: int) -> None:
    run_command(
        build_generate_command(output_dir=output_dir),
        cwd=PWA_DIR,
        timeout_seconds=timeout_seconds,
        stage=f"Kiota {kiota_version()} client generation",
    )
    post_process(output_dir, timeout_seconds)


def check(timeout_seconds: int) -> None:
    with tempfile.TemporaryDirectory(prefix="wfs-kiota-check-") as temp_dir:
        generated = Path(temp_dir)
        generate(generated, timeout_seconds)
        differences = compare_generated_trees(generated, GENERATED_DIR)
        if differences:
            print("❌ Kiota client is out of date with specs/openapi.yaml.")
            for difference in differences:
                print(f"  - {difference}")
            print("👉 Run 'task gen:client' to update it locally.")
            raise RuntimeError("generated client drift detected")
    print("✅ Kiota client is up to date")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("generate", "check"))
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=int(os.environ.get("WFS_KIOTA_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS)),
    )
    args = parser.parse_args()

    try:
        if args.mode == "generate":
            generate(GENERATED_DIR, args.timeout_seconds)
        else:
            check(args.timeout_seconds)
        return 0
    except HarnessTimeoutError as error:
        print(f"❌ {error}", file=sys.stderr)
        print(
            "Verify the .NET 10 runtime and restored Kiota tool. In a restricted "
            "agent sandbox, rerun the Taskfile command with the required permission.",
            file=sys.stderr,
        )
        return 124
    except (FileNotFoundError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"❌ Kiota harness failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
