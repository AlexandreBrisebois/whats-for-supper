import os
import re
import sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SPEC_PATH = os.path.join(ROOT, "specs/openapi.yaml")
CONTROLLERS_DIR = os.path.join(ROOT, "api/src/RecipeApi/Controllers")
CLIENT_DIR = os.path.join(ROOT, "pwa/src/lib/api/generated")

def find_in_spec(target_path):
    with open(SPEC_PATH, 'r') as f:
        spec = yaml.safe_load(f)
    
    paths = spec.get('paths', {})
    for path, methods in paths.items():
        if path.lower() == target_path.lower():
            return {
                "path": path,
                "methods": list(methods.keys()),
                "details": methods
            }
    return None

def find_in_backend(target_path):
    results = []
    for root, dirs, files in os.walk(CONTROLLERS_DIR):
        for file in files:
            if file.endswith("Controller.cs"):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                base_route_match = re.search(r'\[Route\("([^"]+)"\)\]', content)
                base_route = base_route_match.group(1) if base_route_match else ""
                base_route = base_route.replace("[controller]", file.replace("Controller.cs", "").lower())
                
                # Normalize base route
                if not base_route.startswith("/"):
                    base_route = "/" + base_route

                method_pattern = r'\[Http(Get|Post|Put|Delete|Patch)(?:\("([^"]*)"\))?\].*? (\w+)\('
                matches = re.finditer(method_pattern, content, re.DOTALL)
                
                for match in matches:
                    http_method = match.group(1).upper()
                    sub_route = match.group(2) or ""
                    method_name = match.group(3)
                    
                    full_path = base_route
                    if sub_route:
                        if not full_path.endswith("/") and not sub_route.startswith("/"):
                            full_path = f"{full_path}/{sub_route}"
                        else:
                            full_path = f"{full_path}{sub_route}"
                    
                    full_path = full_path.replace("//", "/")
                    # Simple normalization for comparison: replace {id:guid} with {id}
                    norm_path = re.sub(r'\{([^:]+):[^}]+\}', r'{\1}', full_path)
                    
                    if norm_path.lower() == target_path.lower():
                        # Extract the method body (rough approximation)
                        body_start = content.find(match.group(0))
                        body_end = content.find("}", body_start) + 1 # This is very rough
                        results.append({
                            "file": os.path.relpath(path, ROOT),
                            "method": http_method,
                            "csharp_method": method_name,
                            "snippet": content[body_start:body_start+500] + "..."
                        })
    return results

def find_in_client(target_path):
    # Kiota maps /api/recipes/search to apiClient.api.recipes.search
    parts = [p for p in target_path.split("/") if p and p != "api"]
    # We'll just search for the path string in the generated files for now
    # as a more reliable "grep" approach
    found = []
    for root, dirs, files in os.walk(CLIENT_DIR):
        for file in files:
            if file.endswith(".ts"):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                if target_path in content or target_path.replace("{id}", "") in content:
                    found.append(os.path.relpath(path, ROOT))
    return list(set(found))

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 slice.py <path>")
        sys.exit(1)
        
    target_path = sys.argv[1]
    print(f"# Vertical Slice: {target_path}")
    print("\n## 1. OpenAPI Specification")
    spec_info = find_in_spec(target_path)
    if spec_info:
        print(f"✅ Found in spec: `{spec_info['path']}`")
        print(f"Methods: {', '.join(spec_info['methods'])}")
    else:
        print(f"❌ Not found in `openapi.yaml` for exact path `{target_path}`")

    print("\n## 2. Backend Implementation (C#)")
    backend_info = find_in_backend(target_path)
    if backend_info:
        for b in backend_info:
            print(f"### {b['method']} in {b['file']}")
            print(f"C# Method: `{b['csharp_method']}`")
            print("```csharp")
            print(b['snippet'])
            print("```")
    else:
        print("❌ No matching C# Controller method found.")

    print("\n## 3. Frontend Client (TS)")
    client_files = find_in_client(target_path)
    if client_files:
        print("Generated Kiota files:")
        for f in client_files:
            print(f"- `{f}`")
    else:
        print("❌ No generated client files found.")

if __name__ == "__main__":
    main()
