import os
import re
import yaml
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SPEC_PATH = os.path.join(ROOT, "specs/openapi.yaml")
DTO_DIR = os.path.join(ROOT, "api/src/RecipeApi/Dto")

def load_spec_schemas():
    with open(SPEC_PATH, 'r') as f:
        spec = yaml.safe_load(f)
    return spec.get('components', {}).get('schemas', {})

def parse_cs_dto(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Simple regex to find properties: public type Name { get; set; }
    # Also handle [Required] attribute
    prop_pattern = r'(?:\[Required\]\s+)?public\s+([\w<>?]+)\s+(\w+)\s+\{\s*get;\s*set;\s*\}'
    matches = re.finditer(prop_pattern, content)
    
    props = {}
    for m in matches:
        type_name = m.group(1)
        prop_name = m.group(2)
        is_required = "[Required]" in m.group(0) or "?" not in type_name
        props[prop_name] = {
            "type": type_name,
            "required": is_required
        }
    return props

def main():
    print("🔍 Starting Schema Drift Fuzzer...")
    schemas = load_spec_schemas()
    
    issues = 0
    for schema_name, schema_data in schemas.items():
        # Map schema name to C# file (assuming PascalCase naming)
        dto_path = os.path.join(DTO_DIR, f"{schema_name}.cs")
        if not os.path.exists(dto_path):
            # Try appending Dto or similar
            if os.path.exists(os.path.join(DTO_DIR, f"{schema_name}Dto.cs")):
                dto_path = os.path.join(DTO_DIR, f"{schema_name}Dto.cs")
            else:
                continue

        print(f"\nChecking {schema_name} ↔ {os.path.basename(dto_path)}")
        cs_props = parse_cs_dto(dto_path)
        spec_props = schema_data.get('properties', {})
        spec_required = schema_data.get('required', [])

        # Check for missing properties
        for p in spec_props:
            # OpenAPI is camelCase, C# is PascalCase (usually)
            pascal_p = p[0].upper() + p[1:] if p else p
            if pascal_p not in cs_props:
                print(f"⚠️ Property `{p}` found in Spec but missing in C# (`{pascal_p}`)")
                issues += 1
            else:
                # Check requiredness
                is_spec_req = p in spec_required
                is_cs_req = cs_props[pascal_p]['required']
                if is_spec_req != is_cs_req:
                    print(f"⚠️ Nullability mismatch for `{p}`: Spec Required={is_spec_req}, C# Required={is_cs_req}")
                    issues += 1

    if issues == 0:
        print("\n🎉 No schema drift detected!")
    else:
        print(f"\n⚠️ Found {issues} schema drift issues.")

if __name__ == "__main__":
    main()
