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
    # Matches Playwright glob strings and plain strings:
    #   page.route('**/api/foo/*/bar', ...)
    #   page.route('/api/foo', ...)
    route_pattern_string = r'page\.route\(\s*["\']([^"\']+)["\']'
    # Matches JS regex literals: page.route(/.../, ...)
    # Captures everything between the opening /  and the closing /  (which is
    # always followed by a comma or whitespace before the callback argument).
    # We use a non-greedy match and require the closing delimiter to be followed
    # by , or whitespace so we don't accidentally stop at an escaped \/ inside.
    route_pattern_regex = r'page\.route\(\s*/((?:[^/\\]|\\.)+)/[,\s]'

    for root, dirs, files in os.walk(mock_dir):
        for file in files:
            if file.endswith(".spec.ts") or file == "mock-api.ts":
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()

                # --- String-based routes ---
                matches = re.findall(route_pattern_string, content)
                for m in matches:
                    # 1. Strip Playwright glob prefix (**/)
                    clean = re.sub(r'^\*+/', '', m)
                    # 2. Remove any remaining leading slashes
                    clean = clean.lstrip('/')
                    # 3. Convert glob wildcards (*) in path segments to {id}
                    clean = re.sub(r'\*', '{id}', clean)
                    # 4. Trim trailing slash
                    clean = clean.rstrip('/')

                    full_p = f"/{clean}"

                    if spec:
                        norm_full_p = normalize_path(full_p)
                        for se in get_spec_endpoints(spec):
                            if normalize_path(se['path']) == norm_full_p:
                                endpoints.append({
                                    'path': se['path'],
                                    'method': se['method']
                                })

                # --- Regex-literal routes (e.g. page.route(/\/api\/stream/, ...)) ---
                regex_matches = re.findall(route_pattern_regex, content)
                for rx in regex_matches:
                    # Convert JS regex pattern to a plain path string so we can
                    # match it against spec paths.
                    # e.g. r'\/(?:backend\/)?api\/stream' → '/api/stream'
                    # 1. Drop optional non-capturing groups like (?:backend\/)?
                    plain = re.sub(r'\(\?:[^)]+\)\?', '', rx)
                    # 2. Unescape \/ → /
                    plain = plain.replace(r'\/', '/')
                    # 3. Strip any remaining regex metacharacters
                    plain = re.sub(r'[\\^$.|?*+(){}[\]]', '', plain)
                    plain = '/' + plain.lstrip('/')

                    if spec:
                        norm_plain = normalize_path(plain)
                        for se in get_spec_endpoints(spec):
                            if normalize_path(se['path']) == norm_plain:
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

def endpoint_key(endpoint):
    return (endpoint['method'], normalize_path(endpoint['path']))

def discovery():
    print("🔍 API Discovery (Full Backend Surface)")
    print("| Controller | Method | Route | C# Method |")
    print("|------------|--------|-------|-----------|")
    
    endpoints = get_real_endpoints(include_method_name=True)
    endpoints.sort(key=lambda x: (x['controller'], x['path']))
    
    for e in endpoints:
        print(f"| {e['controller']} | {e['method']} | {e['path']} | {e['method_name']} |")

def route_drift():
    """Compare controller routes to specs/openapi.yaml without requiring a running API."""
    print("🔍 Static Route Drift (Controllers vs specs/openapi.yaml)")

    spec = load_spec()
    spec_endpoints = get_spec_endpoints(spec)
    real_endpoints = get_real_endpoints(include_method_name=True)

    spec_by_key = {endpoint_key(e): e for e in spec_endpoints}
    real_by_key = {endpoint_key(e): e for e in real_endpoints}

    issues = 0

    in_real_not_spec = sorted(
        (e for key, e in real_by_key.items() if key not in spec_by_key),
        key=lambda e: (e['path'], e['method']),
    )
    in_spec_not_real = sorted(
        (e for key, e in spec_by_key.items() if key not in real_by_key),
        key=lambda e: (e['path'], e['method']),
    )

    if in_real_not_spec:
        print("\n  In controllers but missing from specs/openapi.yaml:")
        for e in in_real_not_spec:
            print(
                f"    ⚠️  {e['method']} {e['path']} "
                f"({e['controller']}.{e['method_name']})"
            )
            issues += 1

    if in_spec_not_real:
        print("\n  In specs/openapi.yaml but missing from controllers:")
        for e in in_spec_not_real:
            print(f"    ⚠️  {e['method']} {e['path']}")
            issues += 1

    print()
    if issues == 0:
        print("✅ Controller routes match specs/openapi.yaml")
    else:
        print(f"⚠️ Found {issues} route drift issue(s).")
        sys.exit(1)

def is_api_reachable():
    """Return True if the backend API is reachable."""
    import urllib.request
    try:
        urllib.request.urlopen('http://127.0.0.1:5001/health', timeout=2)
        return True
    except Exception:
        return False

def reconcile():
    print("🔍 Starting API Reconciliation...")
    spec = load_spec()
    spec_endpoints = get_spec_endpoints(spec)
    mock_endpoints = get_mock_endpoints(spec)
    real_endpoints = get_real_endpoints()
    api_reachable = is_api_reachable()

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
        methods = sorted(list(set([e['method'] for e in spec_endpoints + mock_endpoints + real_endpoints if e['path'] == p])))
        
        for m in methods:
            norm_p = normalize_path(p)
            
            in_spec = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in spec_endpoints)
            in_mock = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in mock_endpoints)
            in_real = any(normalize_path(e['path']) == norm_p and e['method'] == m for e in real_endpoints)
            
            status_spec = "✅" if in_spec else "❌"
            status_mock = "✅" if in_mock else "❌"
            status_real = "✅" if in_real else "❌"
            
            # If it's in SPEC, it MUST be in MOCK.
            # It MUST also be in REAL — but only when the API is reachable.
            # If it's in MOCK, it SHOULD be in SPEC.
            is_issue = False
            if in_spec and not in_mock:
                is_issue = True
            elif in_spec and not in_real and api_reachable:
                is_issue = True
            elif in_mock and not in_spec:
                is_issue = True
            
            if is_issue:
                issues += 1
                print(f"{m:<8} {p:<45} | {status_spec:<6} | {status_mock:<6} | {status_real:<6} ⚠️")
            else:
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
    parser.add_argument(
        "--route-drift",
        action="store_true",
        help="Compare C# controller routes against specs/openapi.yaml without running the API.",
    )
    
    args = parser.parse_args()
    
    if args.discovery:
        discovery()
    elif args.route_drift:
        route_drift()
    else:
        reconcile()
