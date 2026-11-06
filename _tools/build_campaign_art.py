"""Generate original editable SVG campaign artwork; preserve the ten chapter-one assets."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'adventure'
OUT.mkdir(parents=True, exist_ok=True)

def write(name, title, body, view='0 0 200 200'):
    (OUT / (name + '.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img"><title>{escape(title)}</title>{body}</svg>', encoding='utf-8')

def ink(body):
    return '<g stroke="#222a40" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' + body + '</g>'

def mark(kind, x=100, y=48, size=1):
    shapes = {
        'flame':'<path d="M0-16C18 3 14 16 0 18C-14 16-16 4-7-8L-4 2Z"/>',
        'leaf':'<path d="M-13 13Q-21-9 13-17Q23 10-13 13Z"/><path d="M-13 13 9-9" fill="none"/>',
        'prism':'<path d="m0-17 15 17L0 18-15 0Z"/><path d="M-15 0h30M0-17V18" fill="none"/>',
        'star':'<path d="m0-18 6 12 14 2-10 10 3 14L0 12-13 8-10-6-20-4-6-6Z"/>',
        'drop':'<path d="M0-18Q26 11 0 19Q-26 11 0-18Z"/>',
        'wing':'<path d="M0 11Q-28-10-18-17L0-3 18-17Q28-10 0 11Z"/>',
        'ring':'<circle r="15"/><ellipse rx="23" ry="6" fill="none" transform="rotate(-30)"/>',
        'bolt':'<path d="m-2-20-13 23h13l-5 17L16-7H3l5-13Z"/>',
        'gear':'<path d="m-6-18 12 0 3 8 9 4v12l-9 3-3 9H-6l-3-9-9-3V-6l9-4Z"/><circle r="6" fill="#47576c"/>',
        'shield':'<path d="m-15-12 15-6 15 6v17L0 20-15 5Z"/>',
        'moon':'<path d="M9-17Q-19-15-17 5Q-12 26 12 14Q-10 10 9-17Z"/>',
    }
    return f'<g transform="translate({x} {y}) scale({size})" fill="#ffe0a0" stroke="#29354a" stroke-width="2">{shapes[kind]}</g>'

# Color, silhouette, and emblem are intentionally distinct across element spirits.
spirits = {
    'Na':('#df9278','guard','flame'), 'K':('#a6c882','mage','leaf'), 'Cl':('#9fcba6','sage','prism'),
    'Mg':('#eadbb0','guard','star'), 'Ca':('#d7bb9c','mage','shield'), 'O':('#8bcfd7','sage','wing'),
    'F':('#b7cbd8','guard','wing'), 'Br':('#b97979','mage','drop'), 'I':('#af94cb','sage','prism'),
    'He':('#d9bcde','guard','ring'), 'Ne':('#e9a781','mage','bolt'), 'Ar':('#a5b9dc','sage','moon'),
    'H':('#a5d6e2','guard','drop'), 'C':('#8c9ba9','mage','prism'),
    'Cu':('#c99479','guard','bolt'), 'Zn':('#9ebcba','mage','shield'), 'Al':('#bccfd4','sage','wing'),
    'Cr':('#a1c1b4','mage','prism'), 'Ni':('#c4baa0','sage','gear'),
    'U':('#bad093','guard','star'), 'Pb':('#a3a9bd','mage','shield'), 'Rn':('#b49cc6','sage','ring'),
}
for sym, (color, role, emblem) in spirits.items():
    cape = f'<path d="M60 97 34 169l37-9 29 23 29-23 37 9-26-72" fill="{color}"/>'
    body = '<ellipse cx="100" cy="182" rx="58" ry="9" fill="#11182b" opacity=".3"/>'
    core = cape + '<path d="M70 108h60l12 55H58Z" fill="#e6d2ac"/><path d="M72 162v17H55m73-17v17h17" fill="none" stroke-width="10"/>'
    if role == 'guard':
        core += f'<path d="m61 54 39-24 39 24v49l-39 24-39-24Z" fill="{color}"/><path d="m62 79 38 9 38-9v24l-38 24-38-24Z" fill="#4b5a70"/><path d="M77 97h10m27 0h10" stroke="#b6f2e0" stroke-width="6"/><path d="m26 112 25-8 24 8-4 35-20 20-21-20Z" fill="{color}"/><path d="m39 124 12-5 12 5-3 17-9 10-9-10Z" fill="#cbe7db"/>'
    elif role == 'mage':
        core += f'<path d="M66 61q34-24 68 0v33q-34 34-68 0Z" fill="#f2d4b1"/><path d="m57 66 14-31 16 7 13-21 14 21 16-7 14 31-44-7Z" fill="{color}"/><path d="M83 81v3m34-3v3" stroke-width="6"/><path d="m93 98 7 3 7-3" fill="none"/><path d="M151 81v89" stroke="#ba9d7c" stroke-width="7"/><circle cx="151" cy="78" r="15" fill="{color}"/>'
    else:
        core += f'<path d="M58 65q42-59 84 0l-7 42-35 22-35-22Z" fill="{color}"/><path d="M72 70q28-24 56 0l-4 25-24 15-24-15Z" fill="#3a4d62"/><path d="M84 82v3m32-3v3" stroke="#bbf6df" stroke-width="7"/><path d="m143 128 20-8 15 26-20 12Z" fill="#e7c693"/><path d="m152 131 11 16" stroke="#8a7974"/>'
    core += f'<text x="100" y="149" text-anchor="middle" stroke="none" fill="#34445a" font-family="sans-serif" font-size="21" font-weight="bold">{sym}</text>'
    write('spirit-'+sym.lower(), sym+' 元素夥伴', body+ink(core)+mark(emblem,100,47,.65))

themes = [
    ('flame','#d9987b','烈焰鹼金部落','flame'), ('stone','#d0b395','磐石鹼土要塞','shield'),
    ('forest','#bca5d6','利刃鹵素森林','prism'), ('aurora','#a4cadd','寂靜鈍氣聖殿','ring'),
    ('mist','#91c8ad','迷霧非金屬林','leaf'), ('city','#9ebec7','鋼鐵工匠之城','gear'),
    ('forge','#c9a582','合金鍛造谷','bolt'), ('throne','#c5a6d4','禁忌放射王座','star'),
]
for key, color, title, emblem in themes:
    # Enemy silhouettes: beast, rock colossus, winged hunter, orbit sentinel, tree,
    # machine, furnace, and crystalline guardian respectively.
    silhouettes = {
        'flame':f'<path d="m46 102-20 27 12 30 23-18m93-39 20 27-12 30-23-18" fill="{color}"/><path d="m57 82 43-29 43 29-7 76-36 22-36-22Z" fill="{color}"/><path d="M63 71 49 24l36 23 15-23 15 23 36-23-14 47Z" fill="#e8c18e"/>',
        'stone':f'<path d="m31 77 35-14 15 42-16 58-34-5-13-37Zm138 0-35-14-15 42 16 58 34-5 13-37Z" fill="{color}"/><path d="m60 55 40-26 40 26 11 102-51 24-51-24Z" fill="{color}"/><path d="m66 126 22-14 12 34 22-17 15 26" fill="none" stroke="#685e5a"/>',
        'forest':f'<path d="M68 85 17 49l13 76 39 15m63-55 51-36-13 76-39 15" fill="{color}"/><path d="m60 67 40-39 40 39-10 84-30 27-30-27Z" fill="#9a8bb3"/><path d="m70 54-8-31 27 20m41 11 8-31-27 20" fill="#e3cbad"/>',
        'aurora':f'<ellipse cx="100" cy="105" rx="82" ry="35" fill="none" stroke="{color}" stroke-width="9" transform="rotate(-32 100 105)"/><path d="m65 65 35-25 35 25 10 88-45 28-45-28Z" fill="{color}"/><path d="m64 58 8-30 28 12 28-12 8 30" fill="#e6d6a7"/>',
        'mist':f'<path d="m60 112-31-38-10 13 17 45-13 29 35-9m82-40 31-38 10 13-17 45 13 29-35-9" fill="#809b87"/><path d="m70 69 30-23 30 23 11 91 24 20-38-4-27 8-27-8-38 4 24-20Z" fill="#a7b88a"/><path d="M47 71q-20-30 13-37 10-28 40-17 30-11 40 17 33 7 13 37Z" fill="{color}"/>',
        'city':f'<path d="M26 89h35v72H26zm113 0h35v72h-35Z" fill="#b9a78e"/><path d="M57 63h86v102H57Z" fill="{color}"/><path d="M68 31h64v37H68ZM66 165v17H44m90-17v17h22" fill="#8198a5"/><path d="M30 109h27m86 0h27M30 137h27m86 0h27" stroke="#536575"/>',
        'forge':f'<path d="M54 64h92l12 99-58 21-58-21Z" fill="{color}"/><path d="M66 25h17v40H66zm51 0h17v40h-17Z" fill="#927f76"/><path d="M27 89h25v66H27zm121 0h25v66h-25Z" fill="#8899a4"/><path d="m80 125 20-18 20 18v34H80Z" fill="#e7ac6d"/>',
        'throne':f'<path d="m100 16 45 42-10 103-35 24-35-24L55 58Z" fill="{color}"/><path d="m31 44 21 37-10 77-17-33Zm138 0-21 37 10 77 17-33Z" fill="#a5c6c8"/><path d="m61 59 39 19 39-19M100 78v102" fill="none" stroke="#7e7197"/>',
    }
    face='<path d="m72 86 16 4m24 0 16-4" stroke="#26394d" stroke-width="9"/><path d="M91 106h18" stroke="#34485c"/>'
    write('boss-'+key,title+'關主','<ellipse cx="100" cy="184" rx="66" ry="9" fill="#101626" opacity=".3"/>'+ink(silhouettes[key]+face)+mark(emblem,100,139,.7))

    items = {
        'flame':'<path d="m100 30 48 36-9 72-39 31-39-31-9-72Z" fill="#f0dcc0"/><path d="m52 66 48 22 48-22M100 88v81" fill="none"/><path d="M54 170h92v14H54Z" fill="#a98370"/>',
        'stone':'<path d="M62 130h76l8 47H54Z" fill="#c8b498"/><path d="m59 98 41-26 41 26-13 34H72Z" fill="#869ca4"/><path d="M100 24 79 65l-4 31 25 16 25-16-4-31Z" fill="#fff0c0"/>',
        'forest':'<path d="M35 49q32-14 65 7 33-21 65-7v113q-33-15-65 7-33-22-65-7Z" fill="#d9ccb5"/><path d="M100 56v113M49 76l32 7M49 99l32 7M49 122l22 7" fill="none"/><path d="m131 72 15 26-15 28-15-28Z" fill="#8a73a6"/>',
        'aurora':'<path d="M83 143h34v33H83Z" fill="#c7aa79"/><path d="M69 177h62"/><path d="M63 74q0-49 37-49t37 49q0 40-22 69H85Q63 114 63 74Z" fill="#a6d9df"/><path d="M86 54v44q14 20 28 0V54" fill="none" stroke="#f3b683" stroke-width="9"/>',
        'mist':'<path d="M100 22Q170 103 150 139q-18 35-50 35t-50-35Q30 103 100 22Z" fill="#93d7cf"/><path d="M75 98q-18 37 11 51" fill="none" stroke="#d9f8e7" stroke-width="9"/>',
        'city':'<path d="M58 91q0-43 42-43t42 43v43l16 24H42l16-24Z" fill="#dab586"/><circle cx="100" cy="171" r="12" fill="#b19070"/><path d="M90 44V28h20v16M58 134h84" fill="none"/><path d="M74 92q0-23 18-25" fill="none" stroke="#ffe0ab" stroke-width="7"/>',
        'forge':'<path d="m44 42 56-18 56 18-5 84-51 56-51-56Z" fill="#a8bec1"/><path d="m60 55 40-13 40 13-4 63-36 41-36-41Z" fill="#6d8793"/><path d="M100 42v117M60 88h80" stroke="#dbc198" stroke-width="7"/>',
        'throne':'<circle cx="100" cy="100" r="70" fill="#9b8caf"/><circle cx="100" cy="100" r="56" fill="#354b64"/><path d="m100 44 15 34 37 22-37 15-15 40-15-40-37-15 37-22Z" fill="#c4dcad"/><circle cx="100" cy="100" r="15" fill="#f3dc9f"/>',
    }
    write('item-'+key,title+'任務道具',ink(items[key]))

    buildings = {
        'flame':f'<path d="M466 230V126l44-46 44 46v104" fill="{color}"/><path d="m492 80 18-48 18 48-18 14Z" fill="#ffdda1"/><path d="m386 238 24-84 32 84m122 0 29-91 29 91" fill="#8e6874"/><path d="M495 143h30v70h-30Z" fill="#f0d1a0"/>',
        'stone':f'<path d="M399 253V121h36V99h31v22h75V99h31v22h36v132Z" fill="{color}"/><path d="M475 253v-66q28-41 56 0v66" fill="#63717c"/><path d="M412 146h20v28h-20m142-28h20v28h-20" fill="#eed9ac"/>',
        'forest':f'<path d="m478 252 16-117h40l23 117Z" fill="#86736f"/><path d="M402 151q-26-53 35-73 11-44 65-36 53-11 68 39 67 17 47 70-81 32-215 0Z" fill="{color}"/><path d="M497 201h32v51h-32" fill="#e2c89e"/>',
        'aurora':f'<path d="M396 250V135q29-58 58 0v115m52 0V102q38-73 76 0v148" fill="{color}"/><path d="M411 148h28v74h-28m116-99h33v97h-33" fill="#ebce9d"/><path d="M365 70q140-67 277 1M376 86q125-63 251 1" fill="none" stroke="#8ed8cf" stroke-width="9"/>',
        'mist':f'<path d="M445 250V110h98v140" fill="{color}"/><path d="m425 116 69-64 70 64Z" fill="#7a9d8f"/><path d="M477 148h35v66h-35" fill="#a3dce0"/><path d="M356 234q97-37 219 0t92 0M333 260q123-34 244 0" fill="none" stroke="#a5c9ba" stroke-width="11"/>',
        'city':f'<path d="M385 250V135h62v115m29 0V57h62v193m26 0V113h64v137" fill="{color}"/><circle cx="507" cy="99" r="23" fill="#e1c99f"/><path d="M507 84v15l13 8M399 162h32m-32 31h32m151-48h28m-28 29h28" fill="none"/>',
        'forge':f'<path d="M411 250V107h187v143Z" fill="{color}"/><path d="M434 107V52h24v55m86 0V29h26v78" fill="#80929b"/><path d="M469 250v-71q36-59 72 0v71" fill="#dfb07a"/><path d="M485 239h40l-5-43-14-25-13 25Z" fill="#ffe2a1"/>',
        'throne':f'<path d="m508 30 47 60-13 163h-69L460 90Z" fill="{color}"/><path d="m405 105 26-42 26 42-9 145h-34Zm154 0 26-42 26 42-9 145h-34Z" fill="#8e9fac"/><path d="m508 89 19 25-19 34-19-34Z" fill="#c4e5c4"/><path d="M490 253v-65l18-19 18 19v65" fill="#ead8a7"/>',
    }
    sky='<rect width="700" height="300" fill="#242b45"/><g fill="#d9d9ba"><circle cx="383" cy="30" r="2"/><circle cx="632" cy="48" r="2"/><circle cx="595" cy="24" r="2"/><circle cx="340" cy="83" r="2"/></g><path d="M0 249 177 80 284 221 376 105 520 230 651 141 700 198v102H0" fill="#39415a"/><path d="M0 278 232 203 363 252 496 215 700 255v45H0" fill="#435361"/>'
    write('scene-'+key,title+'冒險場景',sky+ink(buildings[key])+'<path d="m490 253-60 47h160l-62-47Z" fill="#ad9c83" opacity=".6"/>','0 0 700 300')

write('crown','九國星冠',ink('<path d="m35 68 34 27 31-51 31 51 34-27-18 87H53Z" fill="#e1bd7b"/><path d="M52 156h96v23H52Z" fill="#cba16d"/><circle cx="69" cy="126" r="8" fill="#98ddc9"/><circle cx="131" cy="126" r="8" fill="#aeaff0"/>')+mark('star',100,122,.9))
print(f'Generated {len(spirits) + len(themes)*3 + 1} new SVG assets in {OUT}')
