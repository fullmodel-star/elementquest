# -*- coding: utf-8 -*-
"""
703 元素勇者 · 全面 SVG 深度視覺優化（第一層／第二層／第三層）
- 第一層：九大王國卡片專屬奇幻地景與王國徽記 SVG 背景（zoneBgSvg）
- 第二層：元素詳情卡原子量子軌域核心肖像 SVG（elementHeroSvg，取代純文字 emoji）、背誦翻牌卡專屬卡牌陣列 SVG（cardHeroSvg）、47個合成配方產物化學與合金圖鑑 SVG（recipeProductSvg）
- 第三層：元素偵探 13 案件化學實驗現象生動圖解 SVG（caseArtSvg，焰色/氣體/活性/導電）
"""

import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(HERE)
INDEX_PATH = os.path.join(APP_DIR, "index.html")
SW_PATH = os.path.join(APP_DIR, "sw.js")

with open(INDEX_PATH, "rb") as f:
    html = f.read().decode("utf-8")

# 1. 樣式注入
css_to_add = """
  /* 2026-11-01 全面 SVG 視覺升級：第一層王國、第二層詳情/背誦/合成、第三層偵探/試煉 */
  .zone-card { position: relative; overflow: hidden; }
  .eq-zbg-svg { position: absolute; right: -12px; bottom: -12px; width: 116px; height: 116px; opacity: 0.22; pointer-events: none; z-index: 0; transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .3s ease; }
  .zone-card:hover .eq-zbg-svg { opacity: 0.42; transform: scale(1.12) rotate(-5deg); }
  .zone-card > * { position: relative; z-index: 1; }

  .ov-detail-visual { display: flex; align-items: center; justify-content: center; position: relative; width: 104px; height: 104px; flex-shrink: 0; border-radius: 20px; background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.09), rgba(0,0,0,0.5)); border: 1px solid var(--line); box-shadow: inset 0 0 18px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.3); }
  .ov-detail-svg { width: 94px; height: 94px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35)); }
  .ov-detail-app-badge { position: absolute; right: -6px; bottom: -6px; font-size: 1.45rem; background: var(--panel2); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.45); border: 1px solid var(--line); }

  .card-svg-hero { width: 76px; height: 76px; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; }
  .card-svg-hero svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35)); }

  .eq-recipe-icon { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.06); flex-shrink: 0; vertical-align: middle; margin-right: 8px; border: 1px solid rgba(255,255,255,0.08); }
  .eq-recipe-icon svg { width: 22px; height: 22px; }

  .lab-card { position: relative; overflow: hidden; }
  .lab-card-thumb { display: flex; align-items: center; justify-content: center; width: 100%; height: 68px; background: rgba(0,0,0,0.28); border-radius: 10px; margin-bottom: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
  .lab-card-thumb svg { width: 52px; height: 52px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4)); }
  .lab-hero-art { display: flex; align-items: center; justify-content: center; width: 92px; height: 92px; background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.08), rgba(0,0,0,0.45)); border-radius: 18px; margin: 0 auto 12px; border: 1px solid var(--line); box-shadow: 0 4px 14px rgba(0,0,0,0.35); }
  .lab-hero-art svg { width: 72px; height: 72px; }
"""

# Check if CSS already injected
if "eq-zbg-svg" not in html:
    html = html.replace("</style>", css_to_add + "\n</style>", 1)

# 2. JS 向量產生函式注入
js_svg_library = """
/* -------------------- 2026-11-01 全面 SVG 視覺升級函式庫 -------------------- */
/* 第一層：九大王國專屬地景與徽記 SVG */
function zoneBgSvg(key){
  const MAP = {
    nonmetal: '<defs><linearGradient id="zgnm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4ADE80"/><stop offset="100%" stop-color="#065F46"/></linearGradient></defs><circle cx="50" cy="50" r="42" fill="none" stroke="url(#zgnm)" stroke-width="2" stroke-dasharray="4 6"/><path d="M20 65 Q35 45 50 65 T80 65" fill="none" stroke="url(#zgnm)" stroke-width="3"/><path d="M28 50 Q40 35 55 50 T75 50" fill="none" stroke="url(#zgnm)" stroke-width="2" opacity=".6"/><circle cx="32" cy="42" r="4" fill="#4ADE80"/><circle cx="68" cy="38" r="5" fill="#4ADE80"/><circle cx="50" cy="30" r="3" fill="#86EFAC"/><line x1="32" y1="42" x2="50" y2="30" stroke="#4ADE80" stroke-width="1.5"/><line x1="50" y1="30" x2="68" y2="38" stroke="#4ADE80" stroke-width="1.5"/>',
    noble: '<defs><linearGradient id="zgnb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#67E8F9"/><stop offset="100%" stop-color="#1E40AF"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="url(#zgnb)" stroke-width="2"/><g stroke="#67E8F9" stroke-width="2.5" stroke-linecap="round"><line x1="50" y1="18" x2="50" y2="82"/><line x1="22" y1="34" x2="78" y2="66"/><line x1="22" y1="66" x2="78" y2="34"/><path d="M44 26 L50 32 L56 26 M44 74 L50 68 L56 74 M28 42 L36 42 L32 34 M72 58 L64 58 L68 66 M28 58 L36 58 L32 66 M72 42 L64 42 L68 34" fill="none"/></g><circle cx="50" cy="50" r="6" fill="#A5F3FC"/>',
    alkali: '<defs><linearGradient id="zgak" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#EF4444"/><stop offset="50%" stop-color="#F97316"/><stop offset="100%" stop-color="#FDE047"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#F97316" stroke-width="2" stroke-opacity=".4"/><path d="M50 16 C38 34 32 46 32 62 C32 76 40 84 50 84 C60 84 68 76 68 62 C68 46 62 34 50 16 Z" fill="url(#zgak)" opacity=".85"/><path d="M50 42 C44 52 42 60 42 68 C42 76 46 80 50 80 C54 80 58 76 58 68 C58 60 56 52 50 42 Z" fill="#FFF7ED"/><circle cx="28" cy="40" r="2.5" fill="#FDE047"/><circle cx="72" cy="42" r="3" fill="#FDE047"/><circle cx="36" cy="28" r="2" fill="#F97316"/>',
    alkaline: '<defs><linearGradient id="zgae" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#D97706"/><stop offset="100%" stop-color="#78350F"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#D97706" stroke-width="2" stroke-opacity=".4"/><polygon points="50,20 78,36 78,68 50,84 22,68 22,36" fill="url(#zgae)" opacity=".7" stroke="#FDE68A" stroke-width="2"/><polygon points="50,20 78,36 50,52 22,36" fill="#FBBF24" opacity=".5"/><polygon points="50,52 78,36 78,68 50,84" fill="#B45309" opacity=".6"/><polygon points="50,52 22,36 22,68 50,84" fill="#92400E" opacity=".8"/>',
    halogen: '<defs><linearGradient id="zghl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#A855F7"/><stop offset="100%" stop-color="#4C1D95"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#A855F7" stroke-width="2" stroke-opacity=".4"/><g transform="rotate(45 50 50)" fill="url(#zghl)"><path d="M46 16 L54 16 L52 72 L46 72 Z"/><path d="M42 66 L58 66 L50 78 Z"/><rect x="42" y="72" width="16" height="4" rx="2" fill="#E9D5FF"/><rect x="47" y="76" width="6" height="12" fill="#7E22CE"/><circle cx="50" cy="90" r="3" fill="#E9D5FF"/></g><g transform="rotate(-45 50 50)" fill="url(#zghl)"><path d="M46 16 L54 16 L52 72 L46 72 Z"/><path d="M42 66 L58 66 L50 78 Z"/><rect x="42" y="72" width="16" height="4" rx="2" fill="#E9D5FF"/><rect x="47" y="76" width="6" height="12" fill="#7E22CE"/><circle cx="50" cy="90" r="3" fill="#E9D5FF"/></g>',
    metal: '<defs><linearGradient id="zgmt" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94A3B8"/><stop offset="50%" stop-color="#E2E8F0"/><stop offset="100%" stop-color="#475569"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#94A3B8" stroke-width="2" stroke-opacity=".4"/><path d="M24 64 L76 64 L68 76 L32 76 Z" fill="#334155"/><path d="M20 44 L80 44 C72 44 66 52 64 64 L36 64 C34 52 28 44 20 44 Z" fill="url(#zgmt)"/><polygon points="50,22 56,36 44,36" fill="#F59E0B"/><rect x="48" y="34" width="4" height="14" fill="#F59E0B"/><circle cx="36" cy="36" r="2" fill="#FBBF24"/><circle cx="64" cy="34" r="2.5" fill="#FDE047"/>',
    alloy: '<defs><linearGradient id="zgal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#1E3A8A"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#38BDF8" stroke-width="2" stroke-opacity=".4"/><path d="M50 24 L56 24 L58 30 L64 32 L69 28 L74 33 L70 38 L72 44 L78 46 L78 54 L72 56 L70 62 L74 67 L69 72 L64 68 L58 70 L56 76 L44 76 L42 70 L36 68 L31 72 L26 67 L30 62 L28 56 L22 54 L22 46 L28 44 L30 38 L26 33 L31 28 L36 32 L42 30 L44 24 Z" fill="url(#zgal)" opacity=".8"/><circle cx="50" cy="50" r="14" fill="#0B132B"/><circle cx="50" cy="50" r="6" fill="#38BDF8"/>',
    lanth: '<defs><linearGradient id="zgla" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#EC4899"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#EC4899" stroke-width="2" stroke-opacity=".4"/><path d="M28 32 C28 64 72 64 72 32 L62 32 C62 54 38 54 38 32 Z" fill="url(#zgla)" stroke="#F472B6" stroke-width="1.5"/><rect x="26" y="24" width="14" height="12" rx="2" fill="#EF4444"/><rect x="60" y="24" width="14" height="12" rx="2" fill="#3B82F6"/><path d="M20 28 C16 48 24 72 50 78 C76 72 84 48 80 28" fill="none" stroke="#F472B6" stroke-width="1.8" stroke-dasharray="4 4" opacity=".7"/>',
    boss: '<defs><radialGradient id="zgbo" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FACC15"/><stop offset="60%" stop-color="#CA8A04"/><stop offset="100%" stop-color="#713F12"/></radialGradient></defs><circle cx="50" cy="50" r="44" fill="none" stroke="#EAB308" stroke-width="2.5" stroke-dasharray="8 6"/><circle cx="50" cy="50" r="8" fill="#FDE047"/><path d="M50 40 L42 22 A32 32 0 0 1 58 22 Z" fill="url(#zgbo)"/><path d="M41 55 L23 63 A32 32 0 0 1 17 48 Z" fill="url(#zgbo)"/><path d="M59 55 L65 73 A32 32 0 0 1 49 77 Z" fill="url(#zgbo)"/><circle cx="50" cy="50" r="4" fill="#000"/>'
  };
  return `<svg viewBox="0 0 100 100" class="eq-zsvg" aria-hidden="true">${MAP[key]||""}</svg>`;
}

/* 第二層：元素詳情卡原子量子軌域核心插圖 SVG */
function elementHeroSvg(e){
  const color = CAT_COLOR[e.cat] || "#818CF8";
  const num = ATOMIC_NUM[e.sym] || "";
  const p = e.period || 3;
  return `<svg viewBox="0 0 100 100" class="ov-detail-svg" aria-hidden="true">
    <defs>
      <radialGradient id="ehCore-${e.sym}" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="45%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#110A24"/>
      </radialGradient>
      <filter id="ehGlow-${e.sym}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feComposite in="SourceGraphic" in2="b" operator="over"/>
      </filter>
    </defs>
    <!-- 外圈幾何刻度陣列 -->
    <circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="3 5"/>
    <circle cx="50" cy="50" r="41" fill="none" stroke="#FFFFFF" stroke-width="0.8" stroke-opacity="0.2"/>
    
    <!-- 量子軌域環 1 -->
    <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="${color}" stroke-width="1.6" transform="rotate(32 50 50)" stroke-opacity="0.75"/>
    <circle cx="85" cy="30" r="2.8" fill="#FFFFFF" filter="url(#ehGlow-${e.sym})"/>
    
    <!-- 量子軌域環 2 -->
    <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="#FDE047" stroke-width="1.4" transform="rotate(-38 50 50)" stroke-opacity="0.6"/>
    <circle cx="15" cy="70" r="2.4" fill="#FEF08A"/>
    
    ${p >= 4 ? `<ellipse cx="50" cy="50" rx="38" ry="13" fill="none" stroke="#38BDF8" stroke-width="1.2" transform="rotate(85 50 50)" stroke-opacity="0.5"/>` : ''}

    <!-- 原子核發光能量球 -->
    <circle cx="50" cy="50" r="26" fill="url(#ehCore-${e.sym})" filter="url(#ehGlow-${e.sym})" stroke="${color}" stroke-width="2"/>
    
    <!-- 元素符號立體字 -->
    <text x="50" y="${e.sym.length > 1 ? 56 : 57}" font-family="var(--round), system-ui, sans-serif" font-size="${e.sym.length > 2 ? 18 : (e.sym.length > 1 ? 22 : 26)}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))">${e.sym}</text>
    
    ${num ? `<rect x="68" y="10" width="22" height="13" rx="4" fill="rgba(0,0,0,0.6)" stroke="${color}" stroke-width="0.8"/><text x="79" y="20" font-family="system-ui" font-size="9" font-weight="bold" fill="${color}" text-anchor="middle">${num}</text>` : ''}
  </svg>`;
}

/* 第二層：背誦翻牌卡專屬卡牌核心插圖 SVG */
function cardHeroSvg(e){
  const color = CAT_COLOR[e.cat] || "var(--steel)";
  return `<svg viewBox="0 0 80 80" aria-hidden="true">
    <defs>
      <radialGradient id="chGrad-${e.sym}" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="40%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#120E24"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="37" fill="none" stroke="${color}" stroke-width="1.4" stroke-opacity=".35"/>
    <ellipse cx="40" cy="40" rx="34" ry="13" fill="none" stroke="${color}" stroke-width="1.5" transform="rotate(30 40 40)" stroke-opacity=".7"/>
    <ellipse cx="40" cy="40" rx="34" ry="13" fill="none" stroke="#FDE047" stroke-width="1.3" transform="rotate(-30 40 40)" stroke-opacity=".6"/>
    <circle cx="40" cy="40" r="22" fill="url(#chGrad-${e.sym})" stroke="${color}" stroke-width="1.8"/>
    <text x="40" y="46" font-family="var(--round), system-ui, sans-serif" font-size="${e.sym.length > 1 ? 18 : 22}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${e.sym}</text>
  </svg>`;
}

/* 第二層：合成台 47 配方產物專屬向量徽章 SVG */
function recipeProductSvg(r, made){
  if(!made){
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 6h8v4h-2v3l6 9a2 2 0 0 1-1.7 3H9.7a2 2 0 0 1-1.7-3l6-9v-3h-2V6z" fill="none" stroke="#A78BFA" stroke-width="1.8"/>
      <circle cx="16" cy="18" r="1.5" fill="#C4B5FD"/>
      <text x="16" y="24" fill="#DDD6FE" font-size="9" font-weight="bold" text-anchor="middle">?</text>
    </svg>`;
  }
  const nm = r.name || "";
  const prod = r.product || "";
  if(r.type === "alloy" || nm.includes("鋼") || nm.includes("銅") || nm.includes("金") || nm.includes("磁")){
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 21 L16 12 L26 21 L22 25 L10 25 Z" fill="#F59E0B" stroke="#FDE68A" stroke-width="1.2"/>
      <line x1="8" y1="9" x2="24" y2="25" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/>
      <circle cx="16" cy="17" r="3" fill="#38BDF8"/>
    </svg>`;
  }
  if(prod.includes("H₂O") || prod.includes("酸") || nm.includes("水")){
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 6 C12 12, 8 18, 8 22 A8 8 0 0 0 24 22 C24 18, 20 12, 16 6 Z" fill="#38BDF8" fill-opacity=".8" stroke="#7DD3FC" stroke-width="1.2"/>
      <ellipse cx="14" cy="20" rx="3" ry="1.5" fill="#FFFFFF" fill-opacity=".6"/>
    </svg>`;
  }
  if(prod.includes("O₂") || prod.includes("CO₂") || prod.includes("Cl₂") || nm.includes("氣")){
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="#34D399" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="12" cy="16" r="4.5" fill="#6EE7B7"/>
      <circle cx="20" cy="14" r="3.5" fill="#A7F3D0"/>
      <circle cx="16" cy="21" r="2.5" fill="#34D399"/>
    </svg>`;
  }
  if(prod.includes("NaCl") || prod.includes("CaCO₃") || nm.includes("鹽") || nm.includes("晶")){
    return `<svg viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="16,6 26,12 26,22 16,28 6,22 6,12" fill="#818CF8" fill-opacity=".7" stroke="#C7D2FE" stroke-width="1.4"/>
      <line x1="16" y1="6" x2="16" y2="28" stroke="#E0E7FF" stroke-width="1"/>
      <line x1="6" y1="12" x2="26" y2="22" stroke="#E0E7FF" stroke-width="1"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="11" fill="#F43F5E" fill-opacity=".7" stroke="#FECDD3" stroke-width="1.4"/>
    <polygon points="16,9 18,14 23,16 18,18 16,23 14,18 9,16 14,14" fill="#FFFFFF"/>
  </svg>`;
}

/* 第三層：元素偵探 13 案件實驗現象專屬向量插圖 SVG */
function caseArtSvg(c, isHero){
  const sz = isHero ? 72 : 52;
  const id = c.id || "";
  if(id.startsWith("flame")){
    const flameColor = id.includes("sr") ? "#F43F5E" : (id.includes("na") ? "#FBBF24" : (id.includes("cu") ? "#10B981" : "#C084FC"));
    return `<svg viewBox="0 0 60 60" width="${sz}" height="${sz}" aria-hidden="true">
      <path d="M22 52 L38 52 L35 44 L25 44 Z" fill="#94A3B8"/>
      <rect x="28" y="32" width="4" height="12" fill="#CBD5E1"/>
      <path d="M30 10 C22 22 20 28 20 36 C20 44 24 46 30 46 C36 46 40 44 40 36 C40 28 38 22 30 10 Z" fill="${flameColor}" opacity=".9"/>
      <path d="M30 24 C26 30 25 34 25 38 C25 43 27 44 30 44 C33 44 35 43 35 38 C35 34 34 30 30 24 Z" fill="#FFF7ED"/>
    </svg>`;
  }
  if(id.startsWith("gas")){
    return `<svg viewBox="0 0 60 60" width="${sz}" height="${sz}" aria-hidden="true">
      <rect x="22" y="12" width="16" height="36" rx="8" fill="none" stroke="#38BDF8" stroke-width="2.5"/>
      <line x1="20" y1="12" x2="40" y2="12" stroke="#BAE6FD" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="38" r="4" fill="#7DD3FC" opacity=".8"/>
      <circle cx="27" cy="28" r="3" fill="#BAE6FD" opacity=".7"/>
      <circle cx="33" cy="20" r="2.5" fill="#E0F2FE" opacity=".9"/>
      ${id.includes("o2") ? `<polygon points="30,8 32,13 37,14 33,18 34,23 30,20 26,23 27,18 23,14 28,13" fill="#FDE047"/>` : ''}
    </svg>`;
  }
  return `<svg viewBox="0 0 60 60" width="${sz}" height="${sz}" aria-hidden="true">
    <path d="M18 16 L42 16 L38 48 C38 52 34 54 30 54 C26 54 22 52 22 48 Z" fill="rgba(99,102,241,0.2)" stroke="#818CF8" stroke-width="2.5"/>
    <line x1="16" y1="16" x2="44" y2="16" stroke="#C7D2FE" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M23 36 Q30 32 37 36 L36 48 C36 51 33 52 30 52 C27 52 24 51 24 48 Z" fill="#A5B4FC" opacity=".7"/>
    <circle cx="30" cy="42" r="3" fill="#FFFFFF"/>
  </svg>`;
}
"""

# Check if js_svg_library already injected
if "zoneBgSvg" not in html:
    html = html.replace("/* ---------- 地圖 ---------- */", js_svg_library + "\n/* ---------- 地圖 ---------- */", 1)

# 3. 更新 zoneCardEl：加入王國背景徽章 SVG
old_zone_code = """  div.innerHTML = `
    <img class="eq-zimg" src="vendor/fluent-3d/${ZONE_F3D[z.key]||"castle"}.webp" alt="" width="44" height="44">"""

new_zone_code = """  div.innerHTML = `
    <div class="eq-zbg-svg" aria-hidden="true">${zoneBgSvg(z.key)}</div>
    <img class="eq-zimg" src="vendor/fluent-3d/${ZONE_F3D[z.key]||"castle"}.webp" alt="" width="44" height="44">"""

if old_zone_code in html:
    html = html.replace(old_zone_code, new_zone_code, 1)

# 4. 更新 showOvDetail：將 emoji 升級為元素量子核心插圖 SVG
old_ov_detail = """  detail.innerHTML = `
    <div class="ov-detail-emoji">${emoji}</div>
    <div class="ov-detail-body">"""

new_ov_detail = """  detail.innerHTML = `
    <div class="ov-detail-visual" aria-hidden="true">
      ${elementHeroSvg(e)}
      <span class="ov-detail-app-badge" title="生活應用：${e.zh}">${emoji}</span>
    </div>
    <div class="ov-detail-body">"""

if old_ov_detail in html:
    html = html.replace(old_ov_detail, new_ov_detail, 1)

# 5. 更新 showMemCard：卡片正面加入卡牌插畫 SVG
# 先檢查翻牌卡 HTML 是否有 card-svg-hero
old_flashcard_front = """        <div class="card-face card-front">
          <div class="card-emoji" id="cardEmoji"></div>"""

new_flashcard_front = """        <div class="card-face card-front">
          <div class="card-svg-hero" id="cardSvgHero" aria-hidden="true"></div>
          <div class="card-emoji" id="cardEmoji"></div>"""

if old_flashcard_front in html:
    html = html.replace(old_flashcard_front, new_flashcard_front, 1)

# 在 showMemCard 裡更新 cardSvgHero
old_mem_update = """  card.style.setProperty("--fc", CAT_COLOR[e.cat] || "var(--steel)");
  document.getElementById("cardEmoji").textContent = e.emoji;"""

new_mem_update = """  card.style.setProperty("--fc", CAT_COLOR[e.cat] || "var(--steel)");
  const heroEl = document.getElementById("cardSvgHero");
  if(heroEl) heroEl.innerHTML = cardHeroSvg(e);
  document.getElementById("cardEmoji").textContent = e.emoji;"""

if old_mem_update in html:
    html = html.replace(old_mem_update, new_mem_update, 1)

# 6. 更新 renderRecipeList：加入產物配方 SVG
old_recipe_render = """    div.innerHTML = `<span>${icon} ${mats} → ${r.name} <span class="small">${typeTag} ${RARITY_LABEL[r.rarity]||""}</span></span><span class="small">${status}</span>`;"""

new_recipe_render = """    div.innerHTML = `<span class="eq-recipe-icon" aria-hidden="true">${recipeProductSvg(r, made)}</span><span>${icon} ${mats} → ${r.name} <span class="small">${typeTag} ${RARITY_LABEL[r.rarity]||""}</span></span><span class="small">${status}</span>`;"""

if old_recipe_render in html:
    html = html.replace(old_recipe_render, new_recipe_render, 1)

# 7. 更新 renderDetectiveList & renderCase：加入實驗插圖 SVG
old_det_list = """    card.className = "lab-card" + (state.labSolved[c.id] ? " solved" : "");
    card.innerHTML = `<h4>${state.labSolved[c.id] ? "✅ " : "🔎 "}${c.title}</h4><p>${c.gas ? "氣體鑑定" : "物質鑑定"}・${c.tests.length} 種實驗可選</p>`;"""

new_det_list = """    card.className = "lab-card" + (state.labSolved[c.id] ? " solved" : "");
    card.innerHTML = `<div class="lab-card-thumb" aria-hidden="true">${caseArtSvg(c, false)}</div><h4>${state.labSolved[c.id] ? "✅ " : "🔎 "}${c.title}</h4><p>${c.gas ? "氣體鑑定" : "物質鑑定"}・${c.tests.length} 種實驗可選</p>`;"""

if old_det_list in html:
    html = html.replace(old_det_list, new_det_list, 1)

old_det_case = """  box.innerHTML = `<div class="lab-box">
    <h3>🔎 ${c.title}</h3>"""

new_det_case = """  box.innerHTML = `<div class="lab-box">
    <div class="lab-hero-art" aria-hidden="true">${caseArtSvg(c, true)}</div>
    <h3>🔎 ${c.title}</h3>"""

if old_det_case in html:
    html = html.replace(old_det_case, new_det_case, 1)

# 寫回 index.html (以二進位保持 CRLF)
with open(INDEX_PATH, "wb") as f:
    f.write(html.encode("utf-8"))

print("index.html 更新成功！")

# 8. 更新 sw.js 版號 elementquest-v27 -> elementquest-v28
with open(SW_PATH, "rb") as f:
    sw = f.read().decode("utf-8")

sw_new = re.sub(r"elementquest-v\d+", "elementquest-v28", sw)
with open(SW_PATH, "wb") as f:
    f.write(sw_new.encode("utf-8"))

print("sw.js 快取版號升為 elementquest-v28！")
