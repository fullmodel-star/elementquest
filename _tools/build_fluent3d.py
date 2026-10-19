"""下載 Microsoft Fluent Emoji 的 3D 圖（MIT），縮成 128px WebP → vendor/fluent-3d/<key>.webp

    python _tools/build_fluent3d.py
    （需要 Pillow：pip install pillow）

2026-10-19 版面美化「勇者冒險」建立（照 605 的 build_fluent3d.py，改存 WebP、跟 607 一樣省體積）。
- 來源：https://github.com/microsoft/fluentui-emoji （MIT，全文寫到 vendor/fluent-3d/LICENSE.txt）。
- 用途：首屏主視覺（城堡、寶石、交叉劍）、狀態列、六個入口圖格、九大王國卡、鎖頭、研究室切換鈕。
- 顯示最大約 200px（桌機城堡），存 128px（城堡 256px）；下載後檢查是 PNG 檔頭，不合格就停。
- ⚠ Fluent 資料夾名大小寫要完全一樣；有膚色的 emoji（Detective）路徑多一層 Default。
"""
import io
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "vendor" / "fluent-3d"
BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main"

# key → (Fluent 資料夾名, 輸出邊長, 有沒有膚色層)
ICONS = {
    # 首屏主視覺與狀態列
    "castle": ("Castle", 256, False), "gem": ("Gem stone", 128, False), "swords": ("Crossed swords", 128, False),
    "shield": ("Shield", 128, False), "alembic": ("Alembic", 128, False), "trophy": ("Trophy", 128, False),
    # 六個入口
    "compass": ("Compass", 128, False), "map": ("World map", 128, False), "scroll": ("Scroll", 128, False),
    "testtube": ("Test tube", 128, False), "microscope": ("Microscope", 128, False), "locked": ("Locked", 128, False),
    # 研究室切換
    "detective": ("Detective", 128, True), "balance": ("Balance scale", 128, False),
    # 九大王國（對應 index.html 的 ZONE_F3D）
    "fog": ("Fog", 128, False), "snowflake": ("Snowflake", 128, False), "fire": ("Fire", 128, False),
    "rock": ("Rock", 128, False), "dagger": ("Dagger", 128, False), "hammerpick": ("Hammer and pick", 128, False),
    "nutbolt": ("Nut and bolt", 128, False), "magnet": ("Magnet", 128, False), "radioactive": ("Radioactive", 128, False),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for key, (folder, size, skin) in ICONS.items():
        stem = folder.lower().replace(" ", "_")
        if skin:
            url = f"{BASE}/assets/{urllib.parse.quote(folder)}/Default/3D/{urllib.parse.quote(stem + '_3d_default.png')}"
        else:
            url = f"{BASE}/assets/{urllib.parse.quote(folder)}/3D/{urllib.parse.quote(stem + '_3d.png')}"
        raw = fetch(url)
        if not raw.startswith(b"\x89PNG"):
            print(f"[FAIL] {key}：{url} 不是 PNG"); sys.exit(1)
        im = Image.open(io.BytesIO(raw)).convert("RGBA").resize((size, size), Image.LANCZOS)
        dst = OUT / f"{key}.webp"
        im.save(dst, "WEBP", quality=88, method=6)
        total += dst.stat().st_size
        print(f"OK {key:12s} {dst.stat().st_size / 1024:5.1f} KB  ← {folder}")
    (OUT / "LICENSE.txt").write_bytes(fetch(f"{BASE}/LICENSE"))
    print(f"OK LICENSE.txt；圖共 {len(ICONS)} 張 {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
