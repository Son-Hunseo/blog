import json
import re
import sys

data = json.load(sys.stdin)

tags = []
for d in data:
    for t in d.get("imageTags") or []:
        if re.match(r'^\d+\.\d+$', t):
            tags.append(t)

if not tags:
    print("0.1")
    sys.exit(0)

tags.sort(key=lambda x: (int(x.split('.')[0]), int(x.split('.')[1])))

major, minor = map(int, tags[-1].split('.'))
minor += 1

if minor >= 10:
    major += 1
    minor = 0

print(f"{major}.{minor}")
