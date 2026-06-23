"""Extract React code from Figma Make snapshots."""
import json
from pathlib import Path

base = Path(__file__).resolve().parent.parent / "figma-make-extract"
out = Path(__file__).resolve().parent.parent / "frontend-extracted"
out.mkdir(exist_ok=True)

with open(base / "ai_chat.json", encoding="utf-8") as f:
    data = json.load(f)

thread = data["threads"][0]
snapshots = 0
tools = []

for msg in thread["messages"]:
    for part in msg.get("parts", []):
        pt = part.get("partType")
        cj = part.get("contentJson", "")
        if not cj:
            continue
        try:
            c = json.loads(cj)
        except json.JSONDecodeError:
            continue

        if pt == "code-chat-legacy-s3-code-snapshot":
            snapshots += 1
            snap_path = out / f"snapshot_{snapshots}.json"
            snap_path.write_text(json.dumps(c, indent=2), encoding="utf-8")
            if isinstance(c, dict):
                files = c.get("files") or c.get("snapshot", {}).get("files") or {}
                if isinstance(files, dict):
                    for path, content in files.items():
                        dest = out / path.replace("/", "\\").lstrip("\\")
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        if isinstance(content, dict):
                            text = content.get("content") or content.get("code") or json.dumps(content)
                        else:
                            text = str(content)
                        dest.write_text(text, encoding="utf-8")
                        print("Wrote:", dest)

        if pt == "tool-call-json-DO-NOT-USE-IN-PROD":
            name = c.get("toolName", "")
            args = c.get("argsJson", "")
            if args:
                try:
                    a = json.loads(args)
                    tools.append((name, a))
                except json.JSONDecodeError:
                    pass

print(f"\nSnapshots: {snapshots}, tool calls: {len(tools)}")
tool_names = sorted(set(t[0] for t in tools))
print("Tool names:", tool_names)

for name, a in tools:
    if "path" in str(a).lower() or "file" in str(a).lower() or name in ("write", "edit", "create_file"):
        path = a.get("path") or a.get("file_path") or a.get("target_file")
        if path:
            print(f"  {name}: {path}")
