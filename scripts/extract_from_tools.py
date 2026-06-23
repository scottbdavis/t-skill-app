"""Extract final file contents from Figma Make tool calls (chronological)."""
import json
from pathlib import Path

base = Path(__file__).resolve().parent.parent / "figma-make-extract"
root = Path(__file__).resolve().parent.parent / "frontend-extracted"

with open(base / "ai_chat.json", encoding="utf-8") as f:
    data = json.load(f)

files: dict[str, str] = {}

for msg in data["threads"][0]["messages"]:
    for part in msg.get("parts", []):
        if part.get("partType") != "tool-call-json-DO-NOT-USE-IN-PROD":
            continue
        c = json.loads(part["contentJson"])
        name = c.get("toolName")
        try:
            args = json.loads(c.get("argsJson", "{}"))
        except json.JSONDecodeError:
            continue

        path = args.get("path")
        if not path:
            continue

        if name == "write_tool" and args.get("file_text"):
            files[path] = args["file_text"]
        elif name == "edit_tool":
            old = args.get("old_str") or args.get("old_string", "")
            new = args.get("new_str") or args.get("new_string", "")
            if path in files and old:
                files[path] = files[path].replace(old, new, 1)
            elif args.get("file_text"):
                files[path] = args["file_text"]

root.mkdir(parents=True, exist_ok=True)
for path, content in files.items():
    dest = root / path.replace("/", "\\")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")
    print(f"Wrote {path} ({len(content)} chars)")

print(f"\nTotal files: {len(files)}")
