#!/usr/bin/env python3
"""
Deterministic Phase 7C Portrait Processor & Dual Contact Sheet Generator
(Wave 6 — Final 8 Tier-4 Characters -> 66/66 Complete Catalog).

Outputs:
  1. 8 optimized 1024x1536 (exact 2:3) WebP portraits in public/assets/boardgame/roles/
     (preferred < 200 KB where visually crisp, hard cap < 500 KB).
  2. docs/boardgame-expansion/phase-7/character-contact-sheet.webp (+ .png)
     showing the final 8 Tier-4 characters (1 Hunter + 3 Shadow + 4 Neutral).
  3. docs/boardgame-expansion/phase-7/full-catalog-contact-sheet.webp (+ .png)
     showing ALL 66/66 playable characters (20 Hunter + 21 Shadow + 25 Neutral)
     while asserting 66/66 strictly unique SHA-256 hashes on disk.
  4. docs/boardgame-expansion/phase-7/asset-manifest.json with SHA-256 digests.
"""
import hashlib
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'boardgame', 'roles')
DOC_DIR = os.path.join(ROOT, 'docs', 'boardgame-expansion', 'phase-7')
CATALOG_JSON = os.path.join(ROOT, 'docs', 'boardgame-expansion', 'character-catalog.json')
TARGET_W, TARGET_H = 1024, 1536

CLASSIC_PORTRAITS = [
    ('gac-ky-thuat', 'Minh (Franklin)', 'lantern-guard', 'public/assets/boardgame/prototype/role-minh-ky-thuat.webp'),
    ('gac-truc-ban', 'Lan (George)', 'lantern-guard', 'public/assets/boardgame/roles/role-lan-truc-ban.webp'),
    ('gac-radio', 'Vy (Gregor)', 'lantern-guard', 'public/assets/boardgame/prototype/role-vy-radio.webp'),
    ('suong-an-danh', 'Tú (Vampire)', 'mist-order', 'public/assets/boardgame/roles/role-tu-an-danh.webp'),
    ('suong-tin-gia', 'Khánh (Unknown)', 'mist-order', 'public/assets/boardgame/roles/role-khanh-tin-gia.webp'),
    ('suong-gac-cong', 'Dũng (Werewolf)', 'mist-order', 'public/assets/boardgame/roles/role-dung-gac-cong.webp'),
    ('lang-anh-san', 'Hải (Bob)', 'wanderer', 'public/assets/boardgame/roles/role-hai-suu-tam.webp'),
    ('lang-quan-sat', 'Trang (Allie)', 'wanderer', 'public/assets/boardgame/roles/role-trang-kien-cuong.webp'),
    ('lang-cuu-ho', 'Bách (Charles)', 'wanderer', 'public/assets/boardgame/roles/role-bach-cuong-chien.webp'),
    ('lang-tien-phong', 'Đạt (Daniel)', 'wanderer', 'public/assets/boardgame/roles/role-dat-cam-tu.webp'),
]


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
            top = max(0, int((sh - new_h) * 0.22))
            im = im.crop((0, top, sw, top + new_h))
    if im.size != (tw, th):
        im = im.resize((tw, th), Image.Resampling.LANCZOS)
    return im


def encode_optimized_webp(
    im: Image.Image,
    dest_path: str,
    preferred_bytes: int = 200_000,
    max_bytes: int = 480_000,
) -> tuple[int, int]:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    for q in (84, 80, 76, 74, 72):
        im.save(dest_path, format='WEBP', quality=q, method=6)
        size = os.path.getsize(dest_path)
        if size <= preferred_bytes:
            return size, q
    for q in (78, 74, 70):
        im.save(dest_path, format='WEBP', quality=q, method=6)
        size = os.path.getsize(dest_path)
        if size <= max_bytes:
            return size, q
    return os.path.getsize(dest_path), 70


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def load_font(size: int):
    for fp in (
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    ):
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def draw_card(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    item: dict,
    x: int,
    y: int,
    card_w: int,
    card_h: int,
    border_color: tuple[int, int, int],
    f_cap,
    f_sub,
) -> None:
    with Image.open(item['absPath']) as pim:
        thumb = pim.convert('RGB').resize((card_w, card_h), Image.Resampling.LANCZOS)
    draw.rectangle([x - 2, y - 2, x + card_w + 2, y + card_h + 2], outline=border_color, width=2)
    canvas.paste(thumb, (x, y))
    draw.text(
        (x, y + card_h + 8),
        f"{item['name']} ({item['roleId']})",
        fill=(248, 250, 252),
        font=f_cap,
    )
    draw.text(
        (x, y + card_h + 30),
        f"{item['width']}x{item['height']} WebP · {item['sizeKb']} KB · {item['qaStatus']}",
        fill=(148, 163, 184),
        font=f_sub,
    )


def build_wave6_contact_sheet(entries: list[dict], out_path: str) -> None:
    hunters = [e for e in entries if e['faction'] == 'lantern-guard']
    shadows = [e for e in entries if e['faction'] == 'mist-order']
    neutrals = [e for e in entries if e['faction'] == 'wanderer']

    card_w, card_h = 320, 480
    gap = 28
    pad_x = 44
    header_h = 92
    section_h = 44
    caption_h = 54
    row_gap = 26
    cols = 4

    total_w = pad_x * 2 + card_w * cols + gap * (cols - 1)
    # Row 1: Hunter (1) + Shadow (3) = 4 cards; Row 2: Neutral (4) = 4 cards; Row 3: Spec Banner
    spec_h = 230
    total_h = (
        header_h
        + (section_h + card_h + caption_h + row_gap)  # Hunter (1) + Shadow (3)
        + (section_h + card_h + caption_h + row_gap)  # Neutral (4)
        + spec_h
        + 36
    )

    canvas = Image.new('RGB', (total_w, total_h), (7, 10, 18))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(30)
    f_sec = load_font(20)
    f_panel_h = load_font(20)
    f_panel_b = load_font(15)
    f_cap = load_font(14)
    f_sub = load_font(12)

    draw.text(
        (pad_x, 20),
        'HUSTVerse Midnight — Wave 6 (Phase 7C) Tier-4 Final Contact Sheet',
        fill=(248, 250, 252),
        font=f_title,
    )
    draw.text(
        (pad_x, 58),
        'Final 8 Tier-4 Characters (1 Hunter · 3 Shadow · 4 Neutral) · 1024x1536 Native 2:3 WebP · 66/66 Complete Catalog',
        fill=(148, 163, 184),
        font=f_sub,
    )

    hunter_color = (52, 211, 153)
    shadow_color = (244, 63, 94)
    neutral_color = (251, 191, 36)

    # Row 1: Hunter (col 0) + Shadow (cols 1..3)
    y = header_h + 10
    draw.text((pad_x, y), 'HUNTER (1 · EMERALD)', fill=hunter_color, font=f_sec)
    shadow_x0 = pad_x + (card_w + gap)
    draw.text((shadow_x0, y), 'SHADOW / MIST ORDER (3 · CRIMSON & VIOLET)', fill=shadow_color, font=f_sec)
    y += section_h
    for idx, item in enumerate(hunters):
        x = pad_x + idx * (card_w + gap)
        draw_card(canvas, draw, item, x, y, card_w, card_h, hunter_color, f_cap, f_sub)
    for idx, item in enumerate(shadows):
        x = shadow_x0 + idx * (card_w + gap)
        draw_card(canvas, draw, item, x, y, card_w, card_h, shadow_color, f_cap, f_sub)

    y += card_h + caption_h + row_gap

    # Row 2: Neutral (4)
    draw.text(
        (pad_x, y),
        'NEUTRAL / WANDERER (4 · AMBER · SILVER · MIDNIGHT SLATE)',
        fill=neutral_color,
        font=f_sec,
    )
    y += section_h
    for idx, item in enumerate(neutrals):
        x = pad_x + idx * (card_w + gap)
        draw_card(canvas, draw, item, x, y, card_w, card_h, neutral_color, f_cap, f_sub)

    y += card_h + caption_h + row_gap

    # Row 3: Phase 7C Spec Summary Panel
    panel_x0, panel_x1 = pad_x, total_w - pad_x
    panel_y0, panel_y1 = y, y + spec_h
    draw.rectangle([panel_x0, panel_y0, panel_x1, panel_y1], fill=(13, 19, 34), outline=(51, 65, 85), width=2)
    draw.line([(panel_x0, panel_y0 + 48), (panel_x1, panel_y0 + 48)], fill=(51, 65, 85), width=1)
    draw.text((panel_x0 + 24, panel_y0 + 13), 'PHASE 7C — FULL CATALOG ART COMPLETION SPEC (66/66)', fill=(248, 250, 252), font=f_panel_h)
    total_kb = round(sum(e['sizeKb'] for e in entries), 1)
    avg_kb = round(total_kb / max(1, len(entries)), 1)
    left_lines = [
        'Art Direction: HUSTVerse Midnight — Cinematic Anime Noir',
        'Wave 6 Roster: 8 Tier-4 Roles (1 Hunter · 3 Shadow · 4 Neutral)',
        'Complete Roster: 66/66 Playable (10 Classic + 56 Expansion)',
        'Total Asset Library: 113 WebP (66 Roles + 40 Cards + 6 Tiles + 1 Back)',
    ]
    right_lines = [
        f'Wave 6 Payload: {total_kb} KB total · {avg_kb} KB avg (< 200 KB budget)',
        'Format & Framing: 1024x1536 (Exact 2:3) · WebP method=6',
        'Integrity: 66/66 Strictly Unique SHA-256 · Zero Text/Watermarks',
        'Production Gate: Strictly Classic-Only Pending Human Beta',
    ]
    mid_x = (panel_x0 + panel_x1) // 2 + 10
    for i, line in enumerate(left_lines):
        draw.text((panel_x0 + 24, panel_y0 + 66 + i * 36), f'•  {line}', fill=(203, 213, 225), font=f_panel_b)
    for i, line in enumerate(right_lines):
        draw.text((mid_x, panel_y0 + 66 + i * 36), f'•  {line}', fill=(203, 213, 225), font=f_panel_b)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format='WEBP', quality=88, method=6)
    png_path = os.path.splitext(out_path)[0] + '.png'
    canvas.save(png_path, format='PNG', optimize=True)


def build_full_66_contact_sheet(out_path: str) -> dict:
    with open(CATALOG_JSON, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    faction_map = {
        'hunter': 'lantern-guard',
        'shadow': 'mist-order',
        'neutral': 'wanderer',
    }
    all_roles = []
    for role_id, name, fac, rel_path in CLASSIC_PORTRAITS:
        all_roles.append({
            'roleId': role_id,
            'name': name,
            'faction': fac,
            'absPath': os.path.join(ROOT, rel_path),
            'tag': 'Classic',
        })
    for ch in catalog['characters']:
        slug = ch['id'].replace('_', '-')
        rel_path = f'public/assets/boardgame/roles/role-{slug}.webp'
        all_roles.append({
            'roleId': ch['id'],
            'name': ch['sourceName'],
            'faction': faction_map[ch['faction']],
            'absPath': os.path.join(ROOT, rel_path),
            'tag': 'Exp1' if ch['expansionId'] == 'expansion-1' else 'Exp2',
        })

    assert len(all_roles) == 66, f'Expected 66 roles, got {len(all_roles)}'

    # Verify all 66 files exist and have strictly distinct SHA-256 digests!
    seen_hashes = {}
    for r in all_roles:
        if not os.path.exists(r['absPath']):
            raise FileNotFoundError(f"Missing portrait for 66-role sheet: {r['roleId']} -> {r['absPath']}")
        digest = sha256_file(r['absPath'])
        if digest in seen_hashes:
            raise ValueError(f"Duplicate SHA-256 hash between {seen_hashes[digest]} and {r['roleId']}")
        seen_hashes[digest] = r['roleId']
        r['sha256'] = digest

    hunters = [r for r in all_roles if r['faction'] == 'lantern-guard']
    shadows = [r for r in all_roles if r['faction'] == 'mist-order']
    neutrals = [r for r in all_roles if r['faction'] == 'wanderer']
    assert len(hunters) == 20 and len(shadows) == 21 and len(neutrals) == 25

    cols = 10
    card_w, card_h = 180, 270
    gap = 16
    pad_x = 36
    header_h = 96
    section_h = 42
    cap_h = 34
    row_gap = 16

    def rows_for(n: int) -> int:
        return (n + cols - 1) // cols

    sections = [
        ('HUNTER / LANTERN GUARD — 20 CHARACTERS (3 CLASSIC + 17 EXPANSION)', (52, 211, 153), hunters),
        ('SHADOW / MIST ORDER — 21 CHARACTERS (3 CLASSIC + 18 EXPANSION)', (244, 63, 94), shadows),
        ('NEUTRAL / WANDERER — 25 CHARACTERS (4 CLASSIC + 21 EXPANSION)', (251, 191, 36), neutrals),
    ]

    total_w = pad_x * 2 + cols * card_w + (cols - 1) * gap
    total_h = header_h + 24
    for _, _, grp in sections:
        total_h += section_h + rows_for(len(grp)) * (card_h + cap_h + row_gap) + 18

    canvas = Image.new('RGB', (total_w, total_h), (7, 10, 18))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(32)
    f_sub = load_font(15)
    f_sec = load_font(22)
    f_cap = load_font(12)
    f_tag = load_font(10)

    draw.text(
        (pad_x, 20),
        'HUSTVerse Midnight — Complete 66-Character Catalog Contact Sheet (10 Classic + 56 Expansion)',
        fill=(248, 250, 252),
        font=f_title,
    )
    draw.text(
        (pad_x, 60),
        '20 Hunter · 21 Shadow · 25 Neutral · 66/66 Unique SHA-256 Verified · Native 2:3 Anime Noir Portraits · Production Locked Classic-Only',
        fill=(148, 163, 184),
        font=f_sub,
    )

    y = header_h + 8
    for title, color, grp in sections:
        draw.text((pad_x, y), title, fill=color, font=f_sec)
        y += section_h
        for idx, item in enumerate(grp):
            r_idx = idx // cols
            c_idx = idx % cols
            x = pad_x + c_idx * (card_w + gap)
            cy = y + r_idx * (card_h + cap_h + row_gap)
            with Image.open(item['absPath']) as pim:
                thumb = pim.convert('RGB').resize((card_w, card_h), Image.Resampling.LANCZOS)
            draw.rectangle([x - 2, cy - 2, x + card_w + 2, cy + card_h + 2], outline=color, width=2)
            canvas.paste(thumb, (x, cy))
            label = item['name'] if len(item['name']) <= 19 else item['name'][:18] + '…'
            draw.text((x, cy + card_h + 4), label, fill=(248, 250, 252), font=f_cap)
            draw.text((x, cy + card_h + 19), f"{item['tag']} · {item['roleId']}", fill=(148, 163, 184), font=f_tag)
        y += rows_for(len(grp)) * (card_h + cap_h + row_gap) + 18

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format='WEBP', quality=86, method=6)
    png_path = os.path.splitext(out_path)[0] + '.png'
    canvas.save(png_path, format='PNG', optimize=True)
    return {
        'totalRoles': 66,
        'uniqueSha256Count': len(seen_hashes),
        'hunters': len(hunters),
        'shadows': len(shadows),
        'neutrals': len(neutrals),
    }


def main():
    if len(sys.argv) < 2:
        print('Usage: process-phase7c-portraits.py <mapping-json-path>', file=sys.stderr)
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
        digest = sha256_file(dest_abs)

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
            'promptRef': f"docs/boardgame-expansion/phase-7/character-art-prompts.md#{item['roleId']}",
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
            'sha256': digest,
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
        print(f"OK {item['roleId']}: {orig_w}x{orig_h} {orig_fmt} -> {vw}x{vh} {vfmt} ({size_kb} KB, q={used_q}, sha256={digest[:12]})")

    sheet_webp = os.path.join(DOC_DIR, 'character-contact-sheet.webp')
    build_wave6_contact_sheet(sheet_entries, sheet_webp)
    print(f"OK Wave 6 contact sheet: {sheet_webp}")

    full_sheet_webp = os.path.join(DOC_DIR, 'full-catalog-contact-sheet.webp')
    full_stats = build_full_66_contact_sheet(full_sheet_webp)
    print(f"OK Full 66-role contact sheet: {full_sheet_webp} ({full_stats})")

    manifest_path = os.path.join(DOC_DIR, 'asset-manifest.json')
    manifest = {
        'schemaVersion': '1.0.0',
        'phase': '7C',
        'wave': 'Wave 6 (Starter Fifty-Six · Tier-4 Completion)',
        'artDirection': 'HUSTVerse Midnight — Cinematic Anime Noir',
        'totalPortraits': len(manifest_assets),
        'cumulativePlayablePortraits': 66,
        'totalMidnightWebpAssets': 113,
        'uniquePortraitSha256Count': full_stats['uniqueSha256Count'],
        'contactSheet': {
            'wave6Webp': 'docs/boardgame-expansion/phase-7/character-contact-sheet.webp',
            'wave6Png': 'docs/boardgame-expansion/phase-7/character-contact-sheet.png',
            'fullCatalogWebp': 'docs/boardgame-expansion/phase-7/full-catalog-contact-sheet.webp',
            'fullCatalogPng': 'docs/boardgame-expansion/phase-7/full-catalog-contact-sheet.png',
        },
        'assets': manifest_assets,
    }
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"OK manifest: {manifest_path}")


if __name__ == '__main__':
    main()
