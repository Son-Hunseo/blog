import json
import re
import sys


def collect_tags(value):
    tags = []
    if value is None:
        return tags

    if isinstance(value, str):
        return [value]

    if isinstance(value, list):
        for item in value:
            tags.extend(collect_tags(item))
        return tags

    if isinstance(value, dict):
        candidates = value.get("imageTags") or []
        candidates.extend(tag.get("name") for tag in value.get("tags") or [])
        for tag in candidates:
            tags.extend(collect_tags(tag))

    return tags


data = json.load(sys.stdin)
tags = [tag for tag in collect_tags(data) if re.match(r"^\d+\.\d+$", tag)]

if not tags:
    print("0.1")
    sys.exit(0)

tags.sort(key=lambda x: (int(x.split(".")[0]), int(x.split(".")[1])))

major, minor = map(int, tags[-1].split("."))
minor += 1

if minor >= 10:
    major += 1
    minor = 0

print(f"{major}.{minor}")
