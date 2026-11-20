#!/usr/bin/env python3
"""
Deterministic Phase 2.5 Portrait Processor & Contact Sheet Generator.

Reads verified raw generated portraits, enforces exact 2:3 framing (1024x1536),
encodes optimized WebP (< 500 KB) into public/assets/boardgame/roles/,
generates a high-resolution Faction-grouped Contact Sheet, and emits
docs/boardgame-expansion/phase-2.5/asset-manifest.json.
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'boardgame', 'roles')
DOC_DIR = os.path.join(ROOT, 'docs', 'boardgame-expansion', 'phase-2.5')
TARGET_W, TARGET_H = 1024, 1536


def cover_top_resize(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert('RGB')
    sw, sh = im.size
    target_ratio = tw / th
    src_ratio = sw / sh
    if abs(src_ratio - target_ratio) > 0.002:
        if src_ratio > target_ratio:
            new_w = int(round(sh * target_ratio))
            left = (sw - new_w) // 2
            im = im.crop((left, 0, left + new_w, sh))
        else:
            new_h = int(round(sw / target_ratio))
            # Bias slightly toward top so head headroom stays intact
            top = max(0, int((sh - new_h) * 0.25))
            im = im.crop((0, top, sw, top + new_h))
    if im.size != (tw, th):
        im = im.resize((tw, th), Image.Resampling.LANCZOS)
    return im


def encode_optimized_webp(im: Image.Image, dest_path: str, max_bytes: int = 480_000) -> tuple[int, int]:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    for q in (88, 84, 80, 76, 72):
        im.save(dest_path, format='WEBP', quality=q, method=6)
        size = os.path.getsize(dest_path)
        if size <= max_bytes:
            return size, q
    return os.path.getsize(dest_path), 72


def load_font(size: int):
    for fp in (
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ):
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def build_contact_sheet(entries: list[dict], out_path: str) -> None:
    hunters = [e for e in entries if e['faction'] == 'lantern-guard']
    shadows = [e for e in entries if e['faction'] == 'mist-order']

    card_w, card_h = 360, 540
    gap = 28
    pad_x = 44
    header_h = 84
    section_h = 48
    caption_h = 52
    total_w = pad_x * 2 + card_w * 4 + gap * 3
    total_h = header_h + (section_h + card_h + caption_h + 24) * 2 + 32

    canvas = Image.new('RGB', (total_w, total_h), (7, 10, 18))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(30)
    f_sec = load_font(22)
    f_cap = load_font(18)
    f_sub = load_font(14)

    draw.text(
        (pad_x, 22),
        'HUSTVerse Midnight — Starter Eight (Phase 2.5) Contact Sheet',
        fill=(248, 250, 252),
        font=f_title,
    )
    draw.text(
        (pad_x, 58),
        '4 Hunter (Lantern Guard) + 4 Shadow (Mist Order) · Native 2:3 Portrait · Optimized 1024x1536 WebP',
        fill=(148, 163, 184),
        font=f_sub,
    )

    sections = [
        ('HUNTER / LANTERN GUARD (EMERALD · CYAN · AMBER)', (52, 211, 153), hunters),
        ('SHADOW / MIST ORDER (CRIMSON · VIOLET · OBSIDIAN)', (251, 113, 133), shadows),
    ]

    y = header_h + 12
    for sec_title, sec_color, group in sections:
        draw.text((pad_x, y), sec_title, fill=sec_color, font=f_sec)
        y += section_h
        for idx, item in enumerate(group):
            x = pad_x + idx * (card_w + gap)
            with Image.open(item['absPath']) as pim:
                thumb = pim.convert('RGB').resize((card_w, card_h), Image.Resampling.LANCZOS)
            # Subtle faction border
            draw.rectangle([x - 2, y - 2, x + card_w + 2, y + card_h + 2], outline=sec_color, width=2)
            canvas.paste(thumb, (x, y))
            draw.text(
                (x, y + card_h + 8),
                f"{item['name']} ({item['roleId']})",
                fill=(248, 250, 252),
                font=f_cap,
            )
            draw.text(
                (x, y + card_h + 31),
                f"{item['width']}x{item['height']} WebP · {item['sizeKb']} KB · {item['qaStatus']}",
                fill=(148, 163, 184),
                font=f_sub,
            )
        y += card_h + caption_h + 24

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format='WEBP', quality=88, method=6)
    # Also save PNG copy for markdown viewers that prefer PNG
    png_path = os.path.splitext(out_path)[0] + '.png'
    canvas.save(png_path, format='PNG', optimize=True)


def main():
    if len(sys.argv) < 2:
        print('Usage: process-phase25-portraits.py <mapping-json-path>', file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        spec = json.load(f)

    manifest_assets = []
    sheet_entries = []
    for item in spec['portraits']:
        src = item['sourcePath']
        if not os.path.exists(src):
            raise FileNotFoundError(f"Missing source portrait: {src}")
        with Image.open(src) as raw_im:
            orig_w, orig_h = raw_im.size
            orig_fmt = raw_im.format
            processed = cover_top_resize(raw_im, TARGET_W, TARGET_H)

        dest_abs = os.path.join(OUT_DIR, item['filename'])
        size_bytes, used_q = encode_optimized_webp(processed, dest_abs)
        size_kb = round(size_bytes / 1024, 1)

        # Verify decode integrity right after encoding
        with Image.open(dest_abs) as verify_im:
            verify_im.verify()
        with Image.open(dest_abs) as verify_im2:
            vw, vh = verify_im2.size
            vfmt = verify_im2.format

        public_path = f"/assets/boardgame/roles/{item['filename']}"
        rel_repo_path = f"public/assets/boardgame/roles/{item['filename']}"
        manifest_assets.append({
            'roleId': item['roleId'],
            'name': item['name'],
            'faction': item['faction'],
            'publicPath': public_path,
            'repoPath': rel_repo_path,
            'generatorTool': 'AGY builtin image-generator subagent (generate_image)',
            'promptRef': f"docs/boardgame-expansion/phase-2.5/image-generation-prompts.md#{item['roleId']}",
            'rawSourceFilename': os.path.basename(src),
            'rawSourceDimensions': f"{orig_w}x{orig_h}",
            'rawSourceFormat': orig_fmt,
            'width': vw,
            'height': vh,
            'aspectRatio': '2:3',
            'format': vfmt,
            'webpQuality': used_q,
            'fileSizeBytes': size_bytes,
            'fileSizeKb': size_kb,
            'licenseUsageNote': 'AI-generated original illustration for HUSTVerse Midnight (non-commercial educational/game project asset; does not reproduce copyrighted Shadow Hunters artwork).',
            'qaStatus': item.get('qaStatus', 'APPROVED'),
            'qaNotes': item.get('qaNotes', ''),
        })
        sheet_entries.append({
            'roleId': item['roleId'],
            'name': item['name'],
            'faction': item['faction'],
            'absPath': dest_abs,
            'width': vw,
            'height': vh,
            'sizeKb': size_kb,
            'qaStatus': item.get('qaStatus', 'APPROVED'),
        })
        print(f"OK {item['roleId']}: {orig_w}x{orig_h} {orig_fmt} -> {vw}x{vh} {vfmt} ({size_kb} KB, q={used_q})")

    sheet_webp = os.path.join(DOC_DIR, 'starter-eight-contact-sheet.webp')
    build_contact_sheet(sheet_entries, sheet_webp)
    print(f"OK contact sheet: {sheet_webp}")

    manifest_path = os.path.join(DOC_DIR, 'asset-manifest.json')
    manifest = {
        'schemaVersion': '1.0.0',
        'phase': '2.5',
        'artDirection': 'HUSTVerse Midnight — Cinematic Anime Noir',
        'totalPortraits': len(manifest_assets),
        'contactSheet': {
            'webp': 'docs/boardgame-expansion/phase-2.5/starter-eight-contact-sheet.webp',
            'png': 'docs/boardgame-expansion/phase-2.5/starter-eight-contact-sheet.png',
        },
        'assets': manifest_assets,
    }
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"OK manifest: {manifest_path}")


if __name__ == '__main__':
    main()
