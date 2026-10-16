import pytest
from app.utils.color_engine import (
    hex_to_hsl,
    hsl_to_hex,
    calculate_luminance,
    calculate_contrast_ratio,
    generate_complementary_accent,
    generate_tinted_neutrals,
    synthesize_theme,
)

def test_hex_hsl_conversion():
    h, s, l = hex_to_hsl("#ff0000")
    assert round(h) == 0
    assert round(s) == 100
    assert round(l) == 50
    assert hsl_to_hex(0, 100, 50).lower() == "#ff0000"

def test_contrast_ratio_wcag():
    cr = calculate_contrast_ratio("#ffffff", "#000000")
    assert round(cr, 1) == 21.0

    # Texto claro sobre Dark Slate
    cr_slate = calculate_contrast_ratio("#f8fafc", "#0f172a")
    assert cr_slate >= 7.0  # Nível AAA

def test_complementary_accent_opposite():
    # Azul puro (240°) deve ter complemento em Amarelo (60°)
    accent = generate_complementary_accent("#0000ff")
    h, _, _ = hex_to_hsl(accent)
    assert abs(h - 60) <= 5

def test_tinted_neutrals_dark_mode():
    neutrals = generate_tinted_neutrals("#6366f1", mode="dark")
    assert neutrals["bgApp"] != "#000000"  # Proibido preto puro
    assert "bgSurface" in neutrals
    assert "border" in neutrals
    assert "textMain" in neutrals

def test_synthesize_theme_compliance():
    theme = synthesize_theme("Tema escuro para barbearia com toque dourado", mode="dark", base_color="#d97706")
    assert theme["modo"] == "dark"
    assert "cores" in theme
    cores = theme["cores"]
    # Valida WCAG no tema sintetizado
    cr_text = calculate_contrast_ratio(cores["textMain"], cores["bgSurface"])
    assert cr_text >= 4.5
