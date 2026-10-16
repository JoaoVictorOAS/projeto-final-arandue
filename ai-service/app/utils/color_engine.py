"""Motor de Teoria das Cores e Validação de Contraste WCAG 2.1 para Temas Dinâmicos."""

import colorsys
import re
from typing import Tuple, Dict, Any, Optional


def validate_hex(hex_str: str) -> bool:
    """Valida se uma string é uma cor hexadecimal no formato #RRGGBB."""
    if not isinstance(hex_str, str):
        return False
    return bool(re.match(r"^#[0-9a-fA-F]{6}$", hex_str.strip()))


def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Converte hexadecimal #RRGGBB para tupla RGB (0-255)."""
    h = hex_str.strip().lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Converte tupla RGB (0-255) para string hexadecimal #RRGGBB."""
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"


def hex_to_hsl(hex_str: str) -> Tuple[float, float, float]:
    """Converte hexadecimal #RRGGBB para HSL (H: 0-360, S: 0-100, L: 0-100)."""
    r, g, b = [x / 255.0 for x in hex_to_rgb(hex_str)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360.0, s * 100.0, l * 100.0


def hsl_to_hex(h: float, s: float, l: float) -> str:
    """Converte valores HSL (H: 0-360, S: 0-100, L: 0-100) para hexadecimal #RRGGBB."""
    r, g, b = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return rgb_to_hex(round(r * 255), round(g * 255), round(b * 255))


def calculate_luminance(hex_str: str) -> float:
    """Calcula a luminância relativa sRGB conforme definição da WCAG 2.1."""
    r, g, b = [x / 255.0 for x in hex_to_rgb(hex_str)]

    def gamma_correct(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    rl, gl, bl = gamma_correct(r), gamma_correct(g), gamma_correct(b)
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl


def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calcula a taxa de contraste (1:1 a 21:1) entre duas cores hexadecimais segundo WCAG 2.1."""
    l1 = calculate_luminance(hex1)
    l2 = calculate_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def generate_complementary_accent(primary_hex: str) -> str:
    """Gera a cor complementar direta (oposta a 180° no círculo HSL) equilibrando saturação/luminosidade."""
    h, s, l = hex_to_hsl(primary_hex)
    accent_h = (h + 180.0) % 360.0
    accent_s = min(max(s, 60.0), 90.0)
    accent_l = min(max(l, 45.0), 65.0)
    return hsl_to_hex(accent_h, accent_s, accent_l)


def generate_tinted_neutrals(primary_hex: str, mode: str = "dark") -> Dict[str, str]:
    """
    Gera paleta de neutros tintados com a matiz da cor primária (5-8% saturação).
    Nunca utiliza preto absoluto (#000000) no modo dark para evitar 'black crush' e fadiga visual.
    """
    h, _, _ = hex_to_hsl(primary_hex)
    tint_s = 6.0  # Saturação suave (5 a 8%) para neutral funcional

    if mode == "dark":
        bg_app = hsl_to_hex(h, tint_s, 11.0)       # ~#0f172a
        bg_surface = hsl_to_hex(h, tint_s, 17.0)   # ~#1e293b
        bg_hover = hsl_to_hex(h, tint_s, 25.0)     # ~#334155
        border = hsl_to_hex(h, tint_s, 24.0)
        text_main = hsl_to_hex(h, 4.0, 96.0)       # Quase branco com leve tint
        text_sec = hsl_to_hex(h, 6.0, 70.0)
        text_muted = hsl_to_hex(h, 6.0, 50.0)
    else:
        bg_app = hsl_to_hex(h, tint_s, 98.0)       # ~#f8fafc
        bg_surface = "#ffffff"
        bg_hover = hsl_to_hex(h, tint_s, 94.0)
        border = hsl_to_hex(h, tint_s, 88.0)
        text_main = hsl_to_hex(h, 10.0, 11.0)      # Escuro de alto contraste
        text_sec = hsl_to_hex(h, 8.0, 35.0)
        text_muted = hsl_to_hex(h, 6.0, 55.0)

    return {
        "bgApp": bg_app,
        "bgSurface": bg_surface,
        "bgSurfaceHover": bg_hover,
        "border": border,
        "textMain": text_main,
        "textSecondary": text_sec,
        "textMuted": text_muted,
    }


def synthesize_theme(description: str, mode: str = "dark", base_color: Optional[str] = None) -> Dict[str, Any]:
    """Sintetiza um tema completo baseado em descrição textual, modo e cor base opcional."""
    modo_final = "dark" if mode.lower() in ("dark", "escuro", "noturno") else "light"

    # Seleção de cor primária
    if base_color and validate_hex(base_color):
        primary = base_color
    else:
        desc_lower = description.lower()
        if "verde" in desc_lower or "esmeralda" in desc_lower or "sustent" in desc_lower:
            primary = "#059669"
        elif "azul" in desc_lower or "marinho" in desc_lower or "oceano" in desc_lower:
            primary = "#2563eb" if modo_final == "light" else "#3b82f6"
        elif "dourad" in desc_lower or "ambar" in desc_lower or "caf" in desc_lower:
            primary = "#d97706"
        elif "roxo" in desc_lower or "violet" in desc_lower:
            primary = "#7c3aed"
        elif "vermelh" in desc_lower or "vinho" in desc_lower:
            primary = "#dc2626"
        else:
            primary = "#6366f1" if modo_final == "dark" else "#4f46e5"

    h, s, l = hex_to_hsl(primary)
    primary_hover = hsl_to_hex(h, s, max(15.0, l - 8.0) if modo_final == "dark" else max(15.0, l - 10.0))
    primary_text = "#ffffff" if calculate_contrast_ratio("#ffffff", primary) >= 4.5 else "#000000"

    accent = generate_complementary_accent(primary)
    neutrals = generate_tinted_neutrals(primary, mode=modo_final)

    # Validação e correção preventiva de WCAG
    cr_text = calculate_contrast_ratio(neutrals["textMain"], neutrals["bgSurface"])
    if cr_text < 7.0:
        neutrals["textMain"] = "#ffffff" if modo_final == "dark" else "#000000"

    cores = {
        **neutrals,
        "primary": primary,
        "primaryHover": primary_hover,
        "primaryText": primary_text,
        "accent": accent,
        "status": {
            "success": "#34d399" if modo_final == "dark" else "#10b981",
            "danger": "#f87171" if modo_final == "dark" else "#ef4444",
            "warning": "#fbbf24" if modo_final == "dark" else "#f59e0b",
            "info": "#60a5fa" if modo_final == "dark" else "#3b82f6",
        },
    }

    return {
        "nome": f"Tema IA - {description[:30]}",
        "modo": modo_final,
        "descricao": f"Tema gerado por IA baseado em: '{description}'",
        "cores": cores,
        "contraste_texto_wcag": round(calculate_contrast_ratio(cores["textMain"], cores["bgSurface"]), 2),
    }
