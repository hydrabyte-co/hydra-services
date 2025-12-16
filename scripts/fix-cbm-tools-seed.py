#!/usr/bin/env python3
"""
Fix seed-cbm-tools.sh to add required fields:
- category (required)
- scope (required)
- schema.inputSchema (move from top level)
- schema.outputSchema (add default)
- Remove execution.type field (not in schema)
"""

import re
import json
import sys

def determine_category(tool_name):
    """Determine category based on tool name"""
    if 'document' in tool_name.lower():
        return 'data'
    elif 'work' in tool_name.lower():
        return 'productivity'
    elif 'project' in tool_name.lower():
        return 'productivity'
    else:
        return 'system'

def get_output_schema(tool_name):
    """Get appropriate output schema based on tool type"""
    if 'findMany' in tool_name or 'list' in tool_name.lower():
        return {
            "type": "object",
            "properties": {
                "data": {"type": "array"},
                "pagination": {"type": "object"}
            }
        }
    elif 'delete' in tool_name.lower():
        return {
            "type": "object",
            "properties": {
                "message": {"type": "string"}
            }
        }
    else:
        return {
            "type": "object",
            "properties": {
                "success": {"type": "boolean"},
                "data": {"type": "object"}
            }
        }

def fix_tool_json(match):
    """Fix a single tool JSON definition"""
    json_str = match.group(1)

    # Parse JSON (handle shell variable interpolation)
    # Replace shell variables temporarily
    json_str_clean = json_str.replace("'\"$CBM_BASE_URL\"'", '"__CBM_BASE_URL__"')

    try:
        tool = json.loads(json_str_clean)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        print(f"JSON: {json_str_clean[:200]}", file=sys.stderr)
        return match.group(0)

    # Add required fields
    if 'category' not in tool:
        tool['category'] = determine_category(tool['name'])

    if 'scope' not in tool:
        tool['scope'] = 'org'

    # Move inputSchema into schema object
    if 'inputSchema' in tool:
        if 'schema' not in tool:
            tool['schema'] = {}
        tool['schema']['inputSchema'] = tool.pop('inputSchema')

    # Add outputSchema if missing
    if 'schema' in tool and 'outputSchema' not in tool['schema']:
        tool['schema']['outputSchema'] = get_output_schema(tool['name'])

    # Remove execution.type if present (not in schema)
    if 'execution' in tool and 'type' in tool['execution']:
        del tool['execution']['type']

    # Convert back to JSON
    fixed_json = json.dumps(tool, indent=2)

    # Restore shell variable
    fixed_json = fixed_json.replace('"__CBM_BASE_URL__"', "'\"$CBM_BASE_URL\"'")

    return f"create_tool '{fixed_json}'"

# Read stdin
content = sys.stdin.read()

# Find and fix all create_tool calls
# Pattern: create_tool ' ... '
pattern = r"create_tool\s+'(\{[^}]+\}(?:[^']*\{[^}]+\})*[^']*)'"
fixed_content = re.sub(pattern, fix_tool_json, content, flags=re.DOTALL)

# Output
print(fixed_content)
