import os
import re
import sys

def map_controllers(controllers_path):
    print("| Controller | Method | Route | Description |")
    print("|------------|--------|-------|-------------|")
    
    for filename in os.listdir(controllers_path):
        if filename.endswith(".cs"):
            with open(os.path.join(controllers_path, filename), "r") as f:
                content = f.read()
                
                # Extract Controller Name
                controller_match = re.search(r"class (\w+Controller)", content)
                if not controller_match:
                    continue
                controller_name = controller_match.group(1)
                
                # Extract Routes
                # Simplified regex for [HttpGet], [HttpPost("route")], etc.
                methods = re.findall(r"\[(Http\w+)(?:\(\"(.+?)\"\))?\].*?\n\s+.*? (\w+)\(", content, re.MULTILINE)
                
                for http_verb, sub_route, method_name in methods:
                    route = sub_route if sub_route else "/"
                    print(f"| {controller_name} | {http_verb.replace('Http', '').upper()} | {route} | {method_name} |")

if __name__ == "__main__":
    path = "api/src/RecipeApi/Controllers"
    if not os.path.exists(path):
        print(f"Error: Path {path} not found.")
        sys.exit(1)
    map_controllers(path)
