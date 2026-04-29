import argparse
import os
import re
import sys

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SPEC_PATH = os.path.join(ROOT, "specs/openapi.yaml")
DTO_DIR = os.path.join(ROOT, "api/src/RecipeApi/Dto")
GENERATED_API_URL = os.environ.get("GENERATED_API_URL", "http://127.0.0.1:5001/openapi/v1.json")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def load_spec():
    with open(SPEC_PATH, "r") as f:
        return yaml.safe_load(f)


def _spec_paths(spec):
    """Return a set of (METHOD, /path) tuples from an OpenAPI dict."""
    result = set()
    for path, methods in spec.get("paths", {}).items():
        for method in methods:
            if method.lower() in {"get", "post", "put", "delete", "patch"}:
                result.add((method.upper(), path))
    return result


# ---------------------------------------------------------------------------
# Tier 0 — endpoint diff (generated spec vs hand-written spec)
# ---------------------------------------------------------------------------

def run_endpoint_diff(verbose=True):
    """Fetch the .NET-generated spec and diff its paths against specs/openapi.yaml.

    Returns the number of mismatches found.
    """
    try:
        import urllib.request
        import json as _json
        with urllib.request.urlopen(GENERATED_API_URL, timeout=3) as resp:
            generated = _json.loads(resp.read())
    except Exception as exc:
        if verbose:
            print(f"⏭️  Tier 0 skipped — API not reachable at {GENERATED_API_URL} ({exc})")
        return 0

    if verbose:
        print("🌐 Tier 0: Endpoint diff (generated vs spec/openapi.yaml)")

    generated_paths = _spec_paths(generated)
    spec_paths = _spec_paths(load_spec())

    issues = 0

    in_generated_not_spec = generated_paths - spec_paths
    for method, path in sorted(in_generated_not_spec):
        print(f"  ⚠️  {method} {path} — in generated API but missing from specs/openapi.yaml")
        issues += 1

    in_spec_not_generated = spec_paths - generated_paths
    for method, path in sorted(in_spec_not_generated):
        print(f"  ⚠️  {method} {path} — in specs/openapi.yaml but missing from generated API")
        issues += 1

    if issues == 0 and verbose:
        print("  ✅ All endpoints match")

    return issues


# ---------------------------------------------------------------------------
# Tier 1 — DTO schema drift (spec schemas vs C# DTOs)
# ---------------------------------------------------------------------------

def parse_cs_dto(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    props = {}

    # Properties with [JsonPropertyName("...")]
    # Capture everything between public/required and the property name (last word before { or newline)
    json_pattern = (
        r'\[(?:property:\s*)?JsonPropertyName\("([^"]+)"\)\]'
        r'[\s\n]*(?:public\s+)?(?:required\s+)?([\w<>, ?\[\]]+?)\s+(\w+)\s*\{'
    )
    for m in re.finditer(json_pattern, content):
        name = m.group(1)
        type_name = m.group(2).strip()
        is_nullable = type_name.endswith("?") or bool(re.search(r'>\s*\?', type_name))
        is_required = "required" in m.group(0) or not is_nullable
        props[name] = {"required": is_required}

    # Public properties without [JsonPropertyName]
    prop_pattern = r"public\s+(?:required\s+)?([^\n]+?)\s+(\w+)\s+\{\s*get;\s*set;\s*\}"
    for m in re.finditer(prop_pattern, content):
        type_name = m.group(1).strip()
        prop_name = m.group(2)
        if prop_name not in props:
            # A type is nullable if it ends with ? or contains a nullable generic e.g. List<Foo>?
            is_nullable = type_name.endswith("?") or bool(re.search(r'>\s*\?', type_name))
            is_required = "required" in m.group(0) or not is_nullable
            props[prop_name] = {"required": is_required}

    # Record constructor parameters
    record_pattern = r"public\s+record\s+\w+\((.*?)\);"
    for rm in re.finditer(record_pattern, content, re.DOTALL):
        for p in rm.group(1).split(","):
            p = p.strip()
            jpn = re.search(r'JsonPropertyName\("([^"]+)"\)', p)
            if jpn:
                # Use the JSON name from [property: JsonPropertyName("x")]
                name = jpn.group(1)
                # Handle optional default values e.g. string? Intent = "swap"
                type_match = re.search(r'\)\]\s+([\w<>?, \[\]]+?)\s+\w+(?:\s*=.*)?$', p)
                type_name = type_match.group(1).strip() if type_match else ""
                is_nullable = type_name.endswith("?") or bool(re.search(r'>\s*\?', type_name))
                props[name] = {"required": not is_nullable}
            else:
                # Handle optional default values e.g. int weekOffset = 0
                m = re.search(r"([\w<>?\[\]]+)\s+(\w+)(?:\s*=.*)?$", p)
                if m:
                    type_name, prop_name = m.group(1), m.group(2)
                    if prop_name not in props:
                        props[prop_name] = {"required": "?" not in type_name}

    return props


def run_schema_drift(verbose=True):
    """Compare spec component schemas against C# DTO files.

    Returns the number of mismatches found.
    """
    if verbose:
        print("\n📐 Tier 1: Schema drift (specs/openapi.yaml vs C# DTOs)")

    spec = load_spec()
    schemas = spec.get("components", {}).get("schemas", {})
    issues = 0

    for schema_name, schema_data in schemas.items():
        dto_path = os.path.join(DTO_DIR, f"{schema_name}.cs")
        if not os.path.exists(dto_path):
            alt = os.path.join(DTO_DIR, f"{schema_name}Dto.cs")
            if os.path.exists(alt):
                dto_path = alt
            else:
                continue

        if verbose:
            print(f"\n  Checking {schema_name} ↔ {os.path.basename(dto_path)}")

        cs_props = parse_cs_dto(dto_path)
        spec_props = schema_data.get("properties", {})
        spec_required = schema_data.get("required", [])

        for p in spec_props:
            pascal_p = p[0].upper() + p[1:] if p else p
            match = p if p in cs_props else (pascal_p if pascal_p in cs_props else None)

            if not match:
                print(f"    ⚠️  `{p}` in spec but missing in C#")
                issues += 1
            else:
                if (p in spec_required) != cs_props[match]["required"]:
                    print(
                        f"    ⚠️  `{p}` nullability mismatch — "
                        f"spec required={p in spec_required}, C# required={cs_props[match]['required']}"
                    )
                    issues += 1

    if issues == 0 and verbose:
        print("  ✅ No schema drift detected")

    return issues


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="OpenAPI drift detector")
    parser.add_argument(
        "--endpoint-diff",
        action="store_true",
        help="Tier 0 only: diff generated API endpoints against specs/openapi.yaml (requires API running)",
    )
    parser.add_argument(
        "--schema-only",
        action="store_true",
        help="Tier 1 only: compare spec schemas against C# DTOs (skip endpoint diff)",
    )
    args = parser.parse_args()

    print("🔍 OpenAPI Drift Detector\n")
    total = 0

    if args.endpoint_diff:
        total += run_endpoint_diff()
    elif args.schema_only:
        total += run_schema_drift()
    else:
        total += run_endpoint_diff()
        total += run_schema_drift()

    print()
    if total == 0:
        print("🎉 No drift detected!")
    else:
        print(f"⚠️  {total} issue(s) found — update specs/openapi.yaml or C# DTOs to resolve.")
        sys.exit(1)


if __name__ == "__main__":
    main()
