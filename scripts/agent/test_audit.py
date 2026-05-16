import os
import sys
import re

def find_tests(root, area=None):
    unit_tests = []
    e2e_tests = []
    api_tests = []
    
    # PWA Unit tests
    pwa_src = os.path.join(root, "pwa/src")
    if os.path.exists(pwa_src):
        for dirpath, _, filenames in os.walk(pwa_src):
            for f in filenames:
                if f.endswith(".test.ts") or f.endswith(".test.tsx"):
                    path = os.path.join(dirpath, f)
                    if is_relevant(path, area):
                        unit_tests.append(path)
                    
    # PWA E2E tests
    pwa_e2e = os.path.join(root, "pwa/e2e")
    if os.path.exists(pwa_e2e):
        for dirpath, _, filenames in os.walk(pwa_e2e):
            for f in filenames:
                if f.endswith(".spec.ts"):
                    path = os.path.join(dirpath, f)
                    if is_relevant(path, area):
                        e2e_tests.append(path)

    # API Tests
    api_tests_dir = os.path.join(root, "api/src/RecipeApi.Tests")
    if os.path.exists(api_tests_dir):
        for dirpath, _, filenames in os.walk(api_tests_dir):
            for f in filenames:
                if f.endswith("Tests.cs"):
                    path = os.path.join(dirpath, f)
                    if is_relevant(path, area):
                        api_tests.append(path)
                    
    return unit_tests, e2e_tests, api_tests

def is_relevant(path, area):
    if not area:
        return True
    
    # Check filename
    if area.lower() in os.path.basename(path).lower():
        return True
        
    # Check content (this naturally includes test descriptions)
    try:
        with open(path, 'r', errors='ignore') as f:
            content = f.read().lower()
            # If the area is found in the content, it's relevant
            return area.lower() in content
    except:
        return False

def analyze_e2e(path, root):
    analysis_notes = []
    try:
        with open(path, 'r', errors='ignore') as f:
            content = f.read()
            
        # 1. Heuristics for migration candidates
        mock_usage = content.count("mockApi") + content.count("mock-api")
        assertions = content.count("expect(")
        dom_interactions = content.count("page.click") + content.count("page.fill") + content.count("page.locator")
        
        # If assertions are high but DOM interactions are low, it's likely a logic test
        if assertions > 5 and dom_interactions < 3:
            analysis_notes.append("⚠️ Logic-Heavy: Good candidate for Unit Test.")
        if mock_usage > 10:
            analysis_notes.append("🔍 Mock-Heavy: Consider moving to integration/unit test.")
            
        # 2. Brittle Selector Check
        locator_pattern = r"\.locator\(['\"]([^'\"\[][^'\"]*)['\"]\)"
        matches = re.finditer(locator_pattern, content)
        brittle_selectors = [m.group(1) for m in matches]
        
        if brittle_selectors:
            analysis_notes.append(f"❌ {len(brittle_selectors)} brittle selector(s) found (e.g., `{brittle_selectors[0]}`).")
            
        return " ".join(analysis_notes)
    except:
        return ""

def main():
    root = os.getcwd()
    area = sys.argv[1] if len(sys.argv) > 1 else None
    
    unit, e2e, api = find_tests(root, area)
    
    print(f"# Test Audit Report: {area if area else 'Global'}")
    print("\n## Summary")
    print(f"- **PWA Unit**: {len(unit)}")
    print(f"- **PWA E2E**: {len(e2e)}")
    print(f"- **API Tests**: {len(api)}")

    if api:
        print("\n## API Tests (.NET)")
        for t in api:
            print(f"- [ ] `{os.path.relpath(t, root)}`")

    if unit:
        print("\n## PWA Unit Tests (Vitest)")
        for t in unit:
            print(f"- [ ] `{os.path.relpath(t, root)}`")
        
    if e2e:
        print("\n## PWA E2E Tests (Playwright)")
        for t in e2e:
            analysis = analyze_e2e(t, root)
            print(f"- [ ] `{os.path.relpath(t, root)}` {analysis}")

    print("\n## Instructions")
    print("1. Run the checked tests using `task test:unit` or `task test:e2e`.")
    print("2. Ensure they are green before starting work.")
    print("3. For ⚠️ candidates, create a task to migrate logic to Vitest after implementation.")
    print("4. For ❌ findings, replace brittle selectors with `[data-testid=\"...\"]`.")

if __name__ == "__main__":
    main()
