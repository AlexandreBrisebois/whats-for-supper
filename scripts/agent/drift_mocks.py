#!/usr/bin/env python3
import os
import re
import sys

# GUID Regex
GUID_PATTERN = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.I)
# Hardcoded string ID pattern (e.g., id: "recipe-1")
HARDCODED_ID_PATTERN = re.compile(r'id:\s*[\'"]([^\'"]+)[\'"]')

E2E_DIR = 'pwa/e2e'

def audit_file(filepath):
    errors = []
    with open(filepath, 'r') as f:
        content = f.read()
        lines = content.splitlines()

        for i, line in enumerate(lines):
            # Check for hardcoded string IDs that aren't GUIDs
            matches = HARDCODED_ID_PATTERN.finditer(line)
            for match in matches:
                val = match.group(1)
                if not GUID_PATTERN.match(val) and not val.startswith('MOCK_IDS.'):
                    # It might be a variable or a standard MOCK_IDS reference, but let's be strict
                    # If it's a string literal like "recipe-1", it's an error.
                    errors.append(f"Line {i+1}: Found non-GUID hardcoded ID '{val}'")

    return errors

def main():
    all_errors = {}
    
    if not os.path.exists(E2E_DIR):
        print(f"Error: Directory {E2E_DIR} not found.")
        sys.exit(1)

    for root, _, files in os.walk(E2E_DIR):
        for file in files:
            if file.endswith('.spec.ts') or file == 'mock-api.ts':
                path = os.path.join(root, file)
                file_errors = audit_file(path)
                if file_errors:
                    all_errors[path] = file_errors

    if all_errors:
        print("❌ Mock Drift Detected! The following files contain non-compliant IDs:")
        for path, errors in all_errors.items():
            print(f"\n[{path}]")
            for err in errors:
                print(f"  - {err}")
        sys.exit(1)
    else:
        print("✅ No mock drift detected. All hardcoded IDs follow GUID patterns.")
        sys.exit(0)

if __name__ == "__main__":
    main()
