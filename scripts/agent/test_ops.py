import os
import subprocess
import sys
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

def audit():
    print("🔍 Auditing tests for brittle selectors...")
    test_dir = os.path.join(ROOT, "pwa/tests")
    brittle_count = 0
    
    # Pattern to find .locator() calls that don't use data-testid
    # matches .locator('div') but not .locator('[data-testid="foo"]')
    locator_pattern = r"\.locator\(['\"]([^'\"\[][^'\"]*)['\"]\)"
    
    for root, dirs, files in os.walk(test_dir):
        for file in files:
            if file.endswith(".spec.ts"):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                matches = re.finditer(locator_pattern, content)
                for m in matches:
                    print(f"⚠️ Brittle selector found in {os.path.relpath(path, ROOT)}: `{m.group(1)}`")
                    brittle_count += 1
                    
    if brittle_count == 0:
        print("✅ No brittle selectors found in E2E tests.")
    else:
        print(f"⚠️ Total brittle selectors found: {brittle_count}")

def get_impacted_tests():
    try:
        diff = subprocess.check_output(["git", "diff", "--name-only", "main"], cwd=ROOT).decode("utf-8").splitlines()
    except:
        # Fallback to HEAD~1 if main is not available or we are on main
        diff = subprocess.check_output(["git", "diff", "--name-only", "HEAD~1"], cwd=ROOT).decode("utf-8").splitlines()

    impacted = set()
    for file in diff:
        # Backend change
        if "Controllers" in file:
            controller_name = os.path.basename(file).replace("Controller.cs", "").lower()
            test_file = os.path.join(ROOT, f"pwa/tests/{controller_name}.spec.ts")
            if os.path.exists(test_file):
                impacted.add(test_file)
        
        # Frontend change
        if "pwa/app" in file:
            # Try to find a matching test file name
            parts = file.split("/")
            if len(parts) > 2:
                feature = parts[2]
                test_file = os.path.join(ROOT, f"pwa/tests/{feature}.spec.ts")
                if os.path.exists(test_file):
                    impacted.add(test_file)
        
        # Spec change -> Run all
        if "openapi.yaml" in file:
            return [os.path.join(ROOT, "pwa/tests")]

    return list(impacted)

def run_impacted():
    print("🎯 Identifying impacted tests...")
    tests = get_impacted_tests()
    if not tests:
        print("✅ No impacted tests identified for this change.")
        return

    print(f"🚀 Running {len(tests)} impacted test files...")
    for t in tests:
        print(f"  - {os.path.relpath(t, ROOT)}")
    
    cmd = ["npx", "playwright", "test"] + tests
    try:
        subprocess.run(cmd, cwd=os.path.join(ROOT, "pwa"), check=True)
        print("✅ Impacted tests passed!")
    except subprocess.CalledProcessError:
        print("❌ Some impacted tests failed.")
        sys.exit(1)

def main():
    if "--audit" in sys.argv:
        audit()
    elif "--impact" in sys.argv:
        run_impacted()
    else:
        print("Usage: python3 test_ops.py [--audit | --impact]")

if __name__ == "__main__":
    main()
