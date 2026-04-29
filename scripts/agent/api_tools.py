import os
import re
import json
import sys
import argparse

# Paths
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SPEC_PATH = os.path.join(ROOT, "specs/openapi.yaml")
CONTROLLERS_DIR = os.path.join(ROOT, "api/src/RecipeApi/Controllers")

def load_spec():
    try:
        import yaml
    except ImportError:
        print(f"❌ Error: Failed to import yaml. Install with: pip install pyyaml", file=sys.stderr)
        sys.exit(1)
        
    with open(SPEC_PATH, 'r') as f:
        return yaml.safe_load(f)

def get_spec_endpoints(spec):
    endpoints = []
    for path, methods in spec.get('paths', {}).items():
        for method in methods.keys():
            if method.lower() in ['get', 'post', 'put', 'delete', 'patch']:
                endpoints.append({
                    'path': path,
                    'method': method.upper()
                })
    return endpoints

def get_mock_endpoints(spec=None):
    mock_dir = os.path.join(ROOT, "pwa/e2e")
    if not os.path.exists(mock_dir):
        return []
        
    endpoints = []
    # Pattern to capture everything inside page.route(...)
    route_pattern = r'page\.route\((?:\/|["\'])(.*?)(?:\/|["\'])\s*,'
    
    for root, dirs, files in os.walk(mock_dir):
        for file in files:
            if file.endswith(".spec.ts") or file == "mock-api.ts":
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                    
                matches = re.findall(route_pattern, content)
                for m in matches:
                    # Normalize
                    # 1. Remove optional backend part
                    clean = re.sub(r'\\\/\(\?:backend\\\/\)\?|\\\/\(\?:backend\/|\\\/\(backend\/', '', m)
                    # 2. Remove leading slash
                    clean = clean.lstrip('\\/')
                    # 3. Handle specific regex escapes
                    clean = clean.replace('\\/', '/')
                    # 4. Strip trailing regex markers (only at the end of the string)
                    # We split at things that look like regex anchors or optional groups at the end
                    clean = re.split(r'\(\?\:|(?<!\\)\?|(?<!\\)\$|(?<!\\)\(', clean)[0]
                    # 5. Trim trailing slash
                    clean = clean.rstrip('/')
                    # 6. Wildcards .* or dynamic segments like {weekOffset} or [0-9a-f-]+ to {id}
                    clean = re.sub(r'\.\*|\{[^}]+\}|\[[^\]]+\]\+?', '{id}', clean)
                    
                    full_p = f"/{clean}"
                    # Ensure leading slash
                    if not full_p.startswith('/'):
                        full_p = f"/{full_p}"
                        
                    if spec:
                        norm_full_p = normalize_path(full_p)
                        for se in get_spec_endpoints(spec):
                            if normalize_path(se['path']) == norm_full_p:
                                endpoints.append({
                                    'path': se['path'],
                                    'method': se['method']
                                })
    
    # De-duplicate
    unique_endpoints = []
    seen = set()
    for e in endpoints:
        key = (e['path'], e['method'])
        if key not in seen:
            unique_endpoints.append(e)
            seen.add(key)
            
    return unique_endpoints

def get_real_endpoints(include_method_name=False):
    endpoints = []
    for root, dirs, files in os.walk(CONTROLLERS_DIR):
        for file in files:
            if file.endswith("Controller.cs"):
                controller_name = file.replace(".cs", "")
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                # Extract [Route("...")] or [Http...("...")]
                base_route_match = re.search(r'\[Route\("([^"]+)"\)\]', content)
                base_route = base_route_match.group(1) if base_route_match else ""
                base_route = base_route.replace("[controller]", file.replace("Controller.cs", "").lower())
                
                # Find methods
                # Pattern: [HttpVerb("route")] followed by optional other attributes and then the method name
                method_pattern = r'\[Http(Get|Post|Put|Delete|Patch)(?:\("([^"]*)"\))?\].*? (\w+)\('
                # Use re.DOTALL to allow .* to match newlines between attribute and method name
                matches = re.findall(method_pattern, content, re.DOTALL)
                
                for http_method, sub_route, method_name in matches:
                    full_path = f"/{base_route}"
                    if sub_route:
                        if not full_path.endswith("/") and not sub_route.startswith("/"):
                            full_path = f"{full_path}/{sub_route}"
                        else:
                            full_path = f"{full_path}{sub_route}"
                    
                    full_path = full_path.replace("//", "/")
                    
                    # Normalize path (replace {id:guid} with {id})
                    full_path = re.sub(r'\{([^:]+):[^}]+\}', r'{\1}', full_path)
                    
                    item = {
                        'path': full_path,
                        'method': http_method.upper(),
                        'controller': controller_name
                    }
                    if include_method_name:
                        item['method_name'] = method_name
                        
                    endpoints.append(item)
    return endpoints

def normalize_path(path):
    # Replace any {param} with a generic {id} for comparison
    return re.sub(r'\{[^}]+\}', '{id}', path).lower().rstrip('/')

def discovery():
    print("🔍 API Discovery (Full Backend Surface)")
    print("| Controller | Method | Route | C# Method |")
    print("|------------|--------|-------|-----------|")
    
    endpoints = get_real_endpoints(include_method_name=True)
    # Sort by controller then path
    endpoints.sort(key=lambda x: (x['controller'], x['path']))
    
    for e in endpoints:
        print(f"| {e['controller']} | {e['method']} | {e['path']} | {e['method_name']} |")

def reconcile():
    print("🔍 Starting API Reconciliation...")
    spec = load_spec()
    spec_endpoints = get_spec_endpoints(spec)
    mock_endpoints = get_mock_endpoints(spec)
    real_endpoints = get_real_endpoints()

    # Core filter: only care about things in SPEC or MOCK, or core /api/ routes
    all_raw_paths = set([e['path'] for e in spec_endpoints + mock_endpoints + real_endpoints])
    
    # Filter out management/import endpoints from REAL if they aren't in spec
    filtered_paths = []
    for p in all_raw_paths:
        if "/management/" in p or "/import" in p or "original" in p or "hero" in p:
            # Only keep if they are already in the spec or mock
            if any(e['path'] == p for e in spec_endpoints + mock_endpoints):
                filtered_paths.append(p)
            continue
        filtered_paths.append(p)
    
    all_paths = sorted(list(set(filtered_paths)))
    
    print(f"{'METHOD':<8} {'ENDPOINT':<45} | {'SPEC':<6} | {'MOCK':<6} | {'REAL':<6}")
    print("-" * 85)

    issues = 0
    for p in all_paths:
        # Check for each method
        methods = sorted(list(set([e['method'] for e in spec_endpoints + mock_endpoints + real_endpoints if e['path'] == p])))
        
        for m in methods:
            # Match using normalized paths
            norm_p = normalize_path(p)
            
            in_spec = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in spec_endpoints)
            in_mock = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in mock_endpoints)
            in_real = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in real_endpoints)
            
            status_spec = "✅" if in_spec else "❌"
            status_mock = "✅" if in_mock else "❌"
            status_real = "✅" if in_real else "❌"
            
            # If it's in SPEC, it MUST be in MOCK and REAL
            # If it's in MOCK, it SHOULD be in SPEC
            is_issue = False
            if in_spec and (not in_mock or not in_real):
                is_issue = True
            elif in_mock and not in_spec:
                is_issue = True
            
            if is_issue:
                issues += 1
                print(f"{m:<8} {p:<45} | {status_spec:<6} | {status_mock:<6} | {status_real:<6} ⚠️")
            else:
                # Only print non-issues if they are core or in spec
                print(f"{m:<8} {p:<45} | {status_spec:<6} | {status_mock:<6} | {status_real:<6}")

    print("-" * 85)
    if issues == 0:
        print("🎉 Perfect Parity for core endpoints!")
    else:
        print(f"⚠️ Found {issues} reconciliation issues that need attention.")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="API Tools for discovery and reconciliation.")
    parser.add_argument("--discovery", action="store_true", help="Run in discovery mode (map all controllers).")
    
    args = parser.parse_args()
    
    if args.discovery:
        discovery()
    else:
        reconcile()
