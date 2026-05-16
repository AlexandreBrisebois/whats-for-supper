import os
import subprocess
import sys
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
E2E_DIR = os.path.join(ROOT, "pwa/e2e")

def get_impacted_tests():
    try:
        # Check staged changes first
        diff = subprocess.check_output(["git", "diff", "--name-only", "--cached"], cwd=ROOT).decode("utf-8").splitlines()
        # Also check unstaged changes
        diff += subprocess.check_output(["git", "diff", "--name-only"], cwd=ROOT).decode("utf-8").splitlines()
        # Filter duplicates
        diff = list(set(diff))
    except:
        diff = []

    if not diff:
        return []

    impacted = set()
    run_all = False

    for file in diff:
        # Global impact files
        if any(x in file for x in ["openapi.yaml", "playwright.config.ts", "package.json", "Taskfile.yml", "fixtures.ts", "mock-api.ts"]):
            run_all = True
            break

        # High-impact PWA files
        if any(x in file for x in ["pwa/src/components/ui", "pwa/src/components/common", "pwa/src/lib/api", "pwa/src/store"]):
            run_all = True
            break

        # Backend change -> Map Controller to E2E
        if "Controllers" in file:
            controller_name = os.path.basename(file).replace("Controller.cs", "").lower()
            # Special mappings
            if controller_name == "recipe":
                impacted.add(os.path.join(E2E_DIR, "recipes.spec.ts"))
                impacted.add(os.path.join(E2E_DIR, "home-recipe.spec.ts"))
            else:
                # Try to find a spec with the same name
                for test_file in os.listdir(E2E_DIR):
                    if test_file.startswith(controller_name) and test_file.endswith(".spec.ts"):
                        impacted.add(os.path.join(E2E_DIR, test_file))

        # Frontend App/Route changes
        if "pwa/src/app" in file:
            parts = file.split("/")
            # app/(app)/home/page.tsx -> parts[3] is 'home'
            if "(app)" in parts:
                idx = parts.index("(app)")
                if len(parts) > idx + 1:
                    feature = parts[idx + 1]
                    for test_file in os.listdir(E2E_DIR):
                        if test_file.startswith(feature) and test_file.endswith(".spec.ts"):
                            impacted.add(os.path.join(E2E_DIR, test_file))
            
        # Frontend Component changes
        if "pwa/src/components" in file:
            parts = file.split("/")
            if len(parts) > 3:
                feature = parts[3]
                for test_file in os.listdir(E2E_DIR):
                    if test_file.startswith(feature) and test_file.endswith(".spec.ts"):
                        impacted.add(os.path.join(E2E_DIR, test_file))

        # Direct E2E test changes
        if file.startswith("pwa/e2e/") and file.endswith(".spec.ts"):
            impacted.add(os.path.join(ROOT, file))

    if run_all:
        print("🌍 High-impact changes detected. Running all E2E tests.")
        return [E2E_DIR]

    return list(impacted)

def run_impacted():
    if "--all" in sys.argv:
        tests = [E2E_DIR]
    else:
        print("🎯 Identifying impacted tests...")
        tests = get_impacted_tests()

    if not tests:
        print("✅ No impacted tests identified for this change.")
        return

    print(f"🚀 Running impacted tests...")
    for t in tests:
        print(f"  - {os.path.relpath(t, ROOT)}")
    
    # Use playwright directly to leverage workers and config
    cmd = ["npx", "playwright", "test"] + tests
    try:
        subprocess.run(cmd, cwd=os.path.join(ROOT, "pwa"), check=True)
        print("✅ Tests passed!")
    except subprocess.CalledProcessError:
        print("❌ Some tests failed.")
        sys.exit(1)

def main():
    if "--impact" in sys.argv or "--all" in sys.argv:
        run_impacted()
    else:
        print("Usage: python3 test_ops.py [--impact | --all]")

if __name__ == "__main__":
    main()
