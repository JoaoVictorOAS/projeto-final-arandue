import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: [] } }),
    post: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: {} } }),
    put: vi.fn().mockResolvedValue({ data: { sucesso: true, dados: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { sucesso: true } }),
  },
}));

describe('Sidebar - Ícones Laterais e Efeito Hover Web', () => {
  const renderSidebar = (initialRoute = '/', isOpen = true, setIsOpen = vi.fn()) => {
    let result;
    act(() => {
      result = render(
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthProvider>
            <ChatProvider>
              <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
            </ChatProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });
    return result;
  };

  it('deve renderizar a sidebar web com classe sidebar-web e a mobile com sidebar-mobile', () => {
    const { container } = renderSidebar('/', true);

    const sidebarWeb = container.querySelector('aside.hidden.md\\:block .sidebar-web');
    expect(sidebarWeb).not.toBeNull();

    const sidebarMobile = container.querySelector('aside.md\\:hidden .sidebar-mobile');
    expect(sidebarMobile).not.toBeNull();
  });

  it('deve incluir a classe sidebar-nav-icon em todos os ícones laterais de navegação', () => {
    const { container } = renderSidebar('/', false);

    const desktopNav = container.querySelector('aside.hidden.md\\:block nav');
    expect(desktopNav).not.toBeNull();

    const icons = desktopNav.querySelectorAll('.sidebar-nav-icon');
    expect(icons.length).toBe(12);
  });

  it('deve aplicar sidebar-nav-item e sidebar-nav-item-web apenas na versão web desktop', () => {
    const { container } = renderSidebar('/', true);

    const desktopItems = container.querySelectorAll('aside.hidden.md\\:block .sidebar-nav-item');
    expect(desktopItems.length).toBe(12);

    const desktopWebItems = container.querySelectorAll('aside.hidden.md\\:block .sidebar-nav-item-web');
    expect(desktopWebItems.length).toBeGreaterThan(0);

    const mobileWebItems = container.querySelectorAll('aside.md\\:hidden .sidebar-nav-item-web');
    expect(mobileWebItems.length).toBe(0);
  });

  it('deve identificar o item ativo com sidebar-nav-item-active na rota correspondente', () => {
    const { container } = renderSidebar('/clientes', false);

    const desktopNav = container.querySelector('aside.hidden.md\\:block nav');
    const activeItem = desktopNav.querySelector('.sidebar-nav-item-active');
    expect(activeItem).not.toBeNull();
    expect(activeItem.textContent).toContain('Clientes');
  });

  it('deve fechar a gaveta mobile ao clicar em um link', () => {
    const setIsOpenMock = vi.fn();
    const { container } = renderSidebar('/', true, setIsOpenMock);

    const mobileNav = container.querySelector('aside.md\\:hidden nav');
    const linkClientes = mobileNav.querySelector('a[href="/clientes"]');
    expect(linkClientes).not.toBeNull();

    act(() => {
      fireEvent.click(linkClientes);
    });
    expect(setIsOpenMock).toHaveBeenCalledWith(false);
  });

  it('deve renderizar o gatinho decorativo encostado na borda direita no rodapé da sidebar', () => {
    const { container } = renderSidebar('/', true);

    const mascotBadges = container.querySelectorAll('[data-testid="sidebar-mascot-cat"]');
    expect(mascotBadges.length).toBe(2); // desktop and mobile
    mascotBadges.forEach((badge) => {
      const catSvg = badge.querySelector('svg');
      expect(catSvg).not.toBeNull();
      expect(catSvg.getAttribute('aria-label')).toBe('Gatinho decorativo encostado na borda');
    });
  });

  it('deve manter o atalho de vitrine mas não exibir dados de perfil ou logout duplicado no rodapé', () => {
    renderSidebar('/', true);

    // O atalho de vitrine deve existir
    expect(screen.getAllByText('Página Inicial / Vitrine').length).toBeGreaterThan(0);

    // Mas os dados de logout e perfil redundante devem estar removidos da sidebar
    expect(screen.queryByText('admin@mei.com')).toBeNull();
    expect(screen.queryByLabelText('Sair da conta')).toBeNull();
  });
});

