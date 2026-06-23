"""Parse Figma Make export for integration analysis."""
import json
import re
from pathlib import Path

base = Path(__file__).resolve().parent.parent / "figma-make-extract"

with open(base / "ai_chat.json", encoding="utf-8") as f:
    data = json.load(f)

thread = data["threads"][0]
print("Thread type:", thread.get("threadType"))
print("Messages:", len(thread["messages"]))

part_types = {}
for msg in thread["messages"]:
    for part in msg.get("parts", []):
        pt = part.get("partType", "unknown")
        part_types[pt] = part_types.get(pt, 0) + 1
print("Part types:", part_types)

raw = (base / "ai_chat.json").read_text(encoding="utf-8")

paths = sorted(set(re.findall(r'["\']([\w./-]+\.(?:tsx?|jsx?|css|json))["\']', raw)))
print("\nFile paths (first 50):")
for p in paths[:50]:
    print(" ", p)

# part types with code
for msg in thread["messages"]:
    if msg["role"] != "assistant":
        continue
    for part in msg.get("parts", []):
        pt = part.get("partType")
        cj = part.get("contentJson", "")
        if len(cj) > 500 and pt not in ("text",):
            print(f"\n--- Large part: {pt}, {len(cj)} chars ---")
            try:
                c = json.loads(cj)
                print("Keys:", list(c.keys())[:15])
                if "files" in c:
                    for fn in list(c["files"].keys())[:20]:
                        print("  file:", fn)
            except json.JSONDecodeError:
                print(cj[:500])

# blob originals
for blob in (base / "blob_store").rglob("original"):
    size = blob.stat().st_size
    print(f"\nBlob: {blob.relative_to(base)}, {size} bytes")
    if size < 500000:
        text = blob.read_text(encoding="utf-8", errors="replace")
        if "import " in text or "export " in text:
            print(text[:2000])
