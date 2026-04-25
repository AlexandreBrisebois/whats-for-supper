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

def parse_cs_dto(file_path, schema_name):
    with open(file_path, 'r') as f:
        content = f.read()
    
    props = {}
    
    # 1. Find all properties with JsonPropertyName
    json_pattern = r'\[(?:property:\s*)?JsonPropertyName\("([^"]+)"\)\][\s\n]*(?:public\s+)?(?:required\s+)?([^\n(]+?)\s+(\w+)'
    for m in re.finditer(json_pattern, content):
        name = m.group(1)
        type_name = m.group(2).strip()
        is_required = "required" in m.group(0) or "?" not in type_name
        # print(f"DEBUG: {name} | type={type_name} | is_req={is_required}")
        props[name] = {"required": is_required}

    # 2. Find all public properties without JsonPropertyName
    prop_pattern = r'public\s+(?:required\s+)?([^\n]+?)\s+(\w+)\s+\{\s*get;\s*set;\s*\}'
    for m in re.finditer(prop_pattern, content):
        type_name = m.group(1).strip()
        prop_name = m.group(2)
        if prop_name not in props: # Prioritize JsonPropertyName
            is_required = "required" in m.group(0) or "?" not in type_name
            props[prop_name] = {"required": is_required}

    # 3. Find record parameters without JsonPropertyName
    record_pattern = r'public\s+record\s+\w+\((.*?)\);'
    for rm in re.finditer(record_pattern, content, re.DOTALL):
        params = rm.group(1).split(',')
        for p in params:
            if 'JsonPropertyName' in p: continue
            m = re.search(r'([\w<>?\[\]]+)\s+(\w+)$', p.strip())
            if m:
                type_name = m.group(1)
                prop_name = m.group(2)
                if prop_name not in props:
                    is_required = "?" not in type_name
                    props[prop_name] = {"required": is_required}

    return props

def main():
    print("🔍 Starting Schema Drift Fuzzer...")
    schemas = load_spec_schemas()
    
    issues = 0
    for schema_name, schema_data in schemas.items():
        # Map schema name to C# file
        dto_path = os.path.join(DTO_DIR, f"{schema_name}.cs")
        if not os.path.exists(dto_path):
            if os.path.exists(os.path.join(DTO_DIR, f"{schema_name}Dto.cs")):
                dto_path = os.path.join(DTO_DIR, f"{schema_name}Dto.cs")
            else:
                continue

        print(f"\nChecking {schema_name} ↔ {os.path.basename(dto_path)}")
        cs_props = parse_cs_dto(dto_path, schema_name)
        spec_props = schema_data.get('properties', {})
        spec_required = schema_data.get('required', [])

        for p in spec_props:
            pascal_p = p[0].upper() + p[1:] if p else p
            
            match = None
            if p in cs_props:
                match = p
            elif pascal_p in cs_props:
                match = pascal_p
            
            if not match:
                print(f"⚠️ Property `{p}` found in Spec but missing in C#")
                issues += 1
            else:
                is_spec_req = p in spec_required
                is_cs_req = cs_props[match]['required']
                if is_spec_req != is_cs_req:
                    print(f"⚠️ Nullability mismatch for `{p}`: Spec Required={is_spec_req}, C# Required={is_cs_req}")
                    issues += 1

    if issues == 0:
        print("\n🎉 No schema drift detected!")
    else:
        print(f"\n⚠️ Found {issues} schema drift issues.")

    if issues == 0:
        print("\n🎉 No schema drift detected!")
    else:
        print(f"\n⚠️ Found {issues} schema drift issues.")

if __name__ == "__main__":
    main()
