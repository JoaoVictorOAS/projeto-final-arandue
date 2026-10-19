import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import {
  CartoonEyes,
  CatMascotDoodle,
  SidebarCatDoodle,
  OwlMascotDoodle,
  PeaceHandDoodle,
  CoffeeCupDoodle,
  PencilInvoiceDoodle,
  FlamingCursorDoodle,
  WhatsappPhoneDoodle,
  SketchUnderline,
  SketchArrow,
  SketchSparkle,
  SketchStickerBadge,
} from './SketchDoodles';

describe('SketchDoodles - Elementos Desenhados à Mão', () => {
  test('deve renderizar todos os mascotes e ornamentos line-art com SVGs válidos', () => {
    const { container } = render(
      <div>
        <CartoonEyes />
        <CatMascotDoodle />
        <SidebarCatDoodle />
        <OwlMascotDoodle variant="cool" />
        <OwlMascotDoodle variant="beach" />
        <PeaceHandDoodle />
        <CoffeeCupDoodle />
        <PencilInvoiceDoodle />
        <FlamingCursorDoodle />
        <WhatsappPhoneDoodle />
        <SketchUnderline />
        <SketchArrow direction="right" />
        <SketchArrow direction="left" />
        <SketchSparkle />
        <SketchStickerBadge rotate="-6deg">MEI</SketchStickerBadge>
      </div>
    );

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(12);
    expect(screen.getByText('MEI')).toBeInTheDocument();
  });

  test('OwlMascotDoodle deve suportar as variantes cool e beach', () => {
    const { container: coolContainer } = render(<OwlMascotDoodle variant="cool" />);
    expect(coolContainer.querySelector('svg')).toBeInTheDocument();

    const { container: beachContainer } = render(<OwlMascotDoodle variant="beach" />);
    expect(beachContainer.querySelector('svg')).toBeInTheDocument();
  });

  test('SketchArrow deve suportar diferentes direções com transformações', () => {
    const { container } = render(
      <div>
        <SketchArrow direction="right" data-testid="arrow-right" />
        <SketchArrow direction="left" data-testid="arrow-left" />
        <SketchArrow direction="down" data-testid="arrow-down" />
        <SketchArrow direction="up" data-testid="arrow-up" />
      </div>
    );

    const arrows = container.querySelectorAll('svg');
    expect(arrows.length).toBe(4);
  });

  test('SketchStickerBadge deve aplicar a rotação e estilização dashed', () => {
    render(
      <SketchStickerBadge rotate="4deg" className="bg-amber-100 text-amber-900">
        IA NO ZAP
      </SketchStickerBadge>
    );

    const badge = screen.getByText('IA NO ZAP');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ transform: 'rotate(4deg)' });
  });
});
