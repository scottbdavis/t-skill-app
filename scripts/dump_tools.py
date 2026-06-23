import json
from pathlib import Path

base = Path(__file__).resolve().parent.parent / "figma-make-extract"
with open(base / "ai_chat.json", encoding="utf-8") as f:
    data = json.load(f)

for msg in data["threads"][0]["messages"]:
    for part in msg.get("parts", []):
        if part.get("partType") != "tool-call-json-DO-NOT-USE-IN-PROD":
            continue
        c = json.loads(part["contentJson"])
        if c.get("toolName") == "write_tool":
            args = json.loads(c["argsJson"])
            print("=== write_tool ===")
            print(json.dumps(args, indent=2)[:3000])
            break
    else:
        continue
    break
