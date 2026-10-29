"""Read Factum's public /shorts tab. No API key or visitor credentials."""
import json
import re
import subprocess
from pathlib import Path

result = subprocess.run(
    ["yt-dlp", "--flat-playlist", "--playlist-end", "60", "--dump-single-json",
     "--socket-timeout", "20", "--retries", "2",
     "https://www.youtube.com/channel/UCI_k-I94ngDhsccZlRCkGfw/shorts"],
    check=True, capture_output=True, text=True, timeout=360,
)
data = json.loads(result.stdout)
videos = []
seen = set()
for entry in data.get("entries", []):
    video_id = entry.get("id", "")
    title = entry.get("title", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id) or not title or video_id in seen:
        continue
    if title in ("[Private video]", "[Deleted video]"):
        continue
    seen.add(video_id)
    title = re.sub(r"\s*#[^\s]+", "", title).strip()
    videos.append({"id": video_id, "title": title})
if len(videos) < 4:
    raise RuntimeError("Too few Shorts returned; existing catalog was preserved.")
path = Path("factum-shorts.json")
temporary = path.with_suffix(".json.tmp")
temporary.write_text(json.dumps(videos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
temporary.replace(path)
print(f"Catalog updated: {len(videos)} Shorts")
