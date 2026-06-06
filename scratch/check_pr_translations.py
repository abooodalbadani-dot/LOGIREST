import json

with open(r"apps/web/messages/en.json", 'r', encoding='utf-8') as f:
    en = json.load(f)

with open(r"apps/web/messages/ar.json", 'r', encoding='utf-8') as f:
    ar = json.load(f)

proc_en = en.get("procurement", {})
proc_ar = ar.get("procurement", {})

print("EN procurement keys:", list(proc_en.keys()))
if "pr" in proc_en:
    print("EN procurement.pr keys:", list(proc_en["pr"].keys()))

print("AR procurement keys:", list(proc_ar.keys()))
if "pr" in proc_ar:
    print("AR procurement.pr keys:", list(proc_ar["pr"].keys()))
