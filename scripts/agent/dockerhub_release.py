#!/usr/bin/env python3
"""Preflight and create immutable Docker Hub release trigger tags."""

import argparse
import re
import subprocess
import sys


VERSION_RE = re.compile(
    r"^(?P<major>0|[1-9][0-9]*)\.(?P<minor>0|[1-9][0-9]*)\.(?P<patch>0|[1-9][0-9]*)"
    r"(?:-beta\.(?P<beta>[1-9][0-9]*))?$"
)
TRIGGER_PREFIX = "dockerhub/v"


class ReleasePreflightError(RuntimeError):
    pass


def parse_version(version):
    match = VERSION_RE.fullmatch(version)
    if not match:
        raise ValueError(f"Invalid Docker Hub release version: {version}")
    groups = match.groupdict()
    return (
        int(groups["major"]),
        int(groups["minor"]),
        int(groups["patch"]),
        None if groups["beta"] is None else int(groups["beta"]),
    )


def image_version(tag):
    if not tag.startswith(TRIGGER_PREFIX):
        raise ValueError(f"Invalid Docker Hub trigger tag: {tag}")
    version = tag[len(TRIGGER_PREFIX) :]
    parse_version(version)
    return version


def validate_target(version):
    parse_version(version)
    return f"{TRIGGER_PREFIX}{version}"


def version_precedence(version):
    major, minor, patch, beta = parse_version(version)
    # A stable release has higher SemVer precedence than a beta of its version.
    return major, minor, patch, 1 if beta is None else 0, beta or 0


def next_version(tags, kind):
    versions = []
    for tag in tags:
        try:
            versions.append(image_version(tag))
        except ValueError:
            continue

    if not versions:
        return "0.1.0" if kind == "stable" else "0.1.0-beta.1"

    latest = max(versions, key=version_precedence)
    major, minor, patch, beta = parse_version(latest)
    if beta is None:
        patch += 1
        return f"{major}.{minor}.{patch}" if kind == "stable" else f"{major}.{minor}.{patch}-beta.1"
    if kind == "stable":
        return f"{major}.{minor}.{patch}"
    return f"{major}.{minor}.{patch}-beta.{beta + 1}"


def release_versions(tags):
    versions = []
    for tag in tags:
        try:
            versions.append(image_version(tag))
        except ValueError:
            continue
    return versions


def next_beta_version(tags, package_bump=None, beta_bump=False, beta_number=None):
    """Choose an explicit beta target without silently changing the requested axis."""
    if beta_number is not None:
        if package_bump is None:
            raise ValueError("--beta requires --package-bump")
        if beta_number < 1:
            raise ValueError("--beta must be a positive integer")
    if beta_bump and (package_bump is not None or beta_number is not None):
        raise ValueError("--beta-bump cannot be combined with --package-bump or --beta")

    versions = release_versions(tags)
    latest = max(versions, key=version_precedence) if versions else None

    if beta_bump:
        if latest is None or parse_version(latest)[3] is None:
            raise ReleasePreflightError(
                "--beta-bump requires the latest Docker Hub release to be beta."
            )
        major, minor, patch, beta = parse_version(latest)
        return f"{major}.{minor}.{patch}-beta.{beta + 1}"

    if package_bump is None:
        return next_version(tags, "beta")

    major, minor, patch, _ = parse_version(latest) if latest else (0, 0, 0, None)
    if package_bump == "major":
        major, minor, patch = major + 1, 0, 0
    elif package_bump == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    beta = beta_number if beta_number is not None else 1
    return f"{major}.{minor}.{patch}-beta.{beta}"


def require_annotated_tag_object(object_type):
    if object_type != "tag":
        raise ReleasePreflightError("Docker Hub release tags must be annotated tags.")


def assert_target_absent(tag, local_tags, remote_tags):
    if tag in local_tags:
        raise ReleasePreflightError(f"Docker Hub release tag already exists locally: {tag}")
    if tag in remote_tags:
        raise ReleasePreflightError(f"Docker Hub release tag already exists on origin: {tag}")


def git_output(*args):
    return subprocess.run(
        ["git", *args], check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    ).stdout.strip()


def git_run(*args):
    subprocess.run(["git", *args], check=True)


def remote_tags():
    output = git_output("ls-remote", "--tags", "origin", "refs/tags/dockerhub/v*")
    tags = set()
    for line in output.splitlines():
        parts = line.split("\t", 1)
        if len(parts) != 2 or parts[1].endswith("^{}"):
            continue
        tags.add(parts[1].removeprefix("refs/tags/"))
    return tags


def create_tag(kind, package_bump=None, beta_bump=False, beta_number=None):
    if kind != "beta" and (package_bump is not None or beta_bump or beta_number is not None):
        raise ValueError("Beta version controls are only valid for beta releases.")
    git_run("fetch", "origin", "main", "--tags", "--quiet")
    local = set(git_output("tag", "--list", "dockerhub/v*").splitlines())
    remote = remote_tags()
    version = (
        next_beta_version(local | remote, package_bump, beta_bump, beta_number)
        if kind == "beta"
        else next_version(local | remote, kind)
    )
    tag = validate_target(version)

    if git_output("status", "--porcelain", "--untracked-files=all"):
        raise ReleasePreflightError("Worktree is dirty; Docker Hub release tags require a clean worktree.")

    try:
        git_run("merge-base", "--is-ancestor", "HEAD", "origin/main")
    except subprocess.CalledProcessError as error:
        raise ReleasePreflightError("HEAD must be reachable from origin/main.") from error

    assert_target_absent(tag, local, remote)
    commit = git_output("rev-parse", "HEAD")
    print(f"Docker Hub tag: {tag}")
    print(f"Commit:         {commit}")

    if not sys.stdin.isatty():
        raise ReleasePreflightError("Interactive confirmation is required; refusing to create a tag.")
    if input("Create and push this annotated tag? [y/N] ").strip().lower() not in {"y", "yes"}:
        print("No tag created.")
        return

    git_run("tag", "-a", tag, "-m", f"Docker Hub release {version}", "HEAD")
    git_run("push", "origin", tag)
    print(f"Created and pushed {tag}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=("stable", "beta"))
    parser.add_argument(
        "--package-bump",
        choices=("major", "minor", "patch"),
        help="Bump the package version for a beta release; beta resets to 1 unless --beta is set.",
    )
    parser.add_argument(
        "--beta-bump",
        action="store_true",
        help="Increment only the beta number; requires the latest release to be beta.",
    )
    parser.add_argument(
        "--beta",
        type=int,
        metavar="N",
        help="Use beta number N with --package-bump.",
    )
    args = parser.parse_args()
    try:
        create_tag(args.kind, args.package_bump, args.beta_bump, args.beta)
    except (ReleasePreflightError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Docker Hub release preflight failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
