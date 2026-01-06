import { el } from '../../mount.js';
import { renderSidebarItem } from './sidebar-item.js';
import { renderSidebarFooter } from './sidebar-footer.js';

export function renderSidebar(config, state) {
  const isCollapsed = !state.state.sidebar.isOpen;
  const isMobile = window.innerWidth < 750;
  
  const classes = ['sidebar'];
  
  if (isCollapsed && !isMobile) {
    classes.push('sidebar--collapsed');
  }
  
  if (isMobile) {
    classes.push('sidebar--overlay');
  }
  
  const sidebar = el('aside', {
    id: 'sidebar',
    class: classes.join(' '),
    'aria-label': 'Menú de navegación'
  }, [
    // Sidebar content
    el('nav', { class: 'sidebar-content', 'aria-label': 'Menú principal' }, [
      // Botón de búsqueda (primer item especial)
      renderSearchButton(state, isCollapsed),
      
      // Items normales del menú
      ...config.items.map(item => renderSidebarItem(item, state, isCollapsed))
    ]),
    
    // Sidebar footer
    config.footer && config.footer.enabled && !(isCollapsed && config.footer.hideWhenCollapsed) ?
    renderSidebarFooter(config.footer, state) :
    null
  ].filter(Boolean));
  
  return sidebar;
}

function renderSearchButton(state, isCollapsed) {
  const searchButton = el('button', {
    class: 'sidebar-item sidebar-search-button',
    'data-tooltip': isCollapsed ? 'Buscar (Ctrl+K)' : null,
    onclick: () => {
      if (window.openSearchModal) {
        window.openSearchModal();
      }
    }
  }, [
    el('span', { class: 'sidebar-item-icon' }, '🔍'),
    el('span', { class: 'sidebar-item-label' }, 'Buscar'),
    el('kbd', { class: 'sidebar-search-kbd' }, isCollapsed ? '' : '⌘K')
  ]);
  
  // Tooltip en colapsado
  if (isCollapsed) {
    searchButton.addEventListener('mouseenter', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      
      const tooltip = el('div', {
        class: 'tooltip tooltip--visible',
        style: {
          position: 'fixed',
          left: `${rect.right + 10}px`,
          top: `${rect.top + rect.height / 2}px`,
          transform: 'translateY(-50%)',
          background: '#111827',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          zIndex: '2000',
          pointerEvents: 'none'
        }
      }, 'Buscar (Ctrl+K)');
      
      document.body.appendChild(tooltip);
      window._searchButtonTooltip = tooltip;
    });
    
    searchButton.addEventListener('mouseleave', () => {
      if (window._searchButtonTooltip && window._searchButtonTooltip.parentNode) {
        window._searchButtonTooltip.parentNode.removeChild(window._searchButtonTooltip);
        window._searchButtonTooltip = null;
      }
    });
  }
  
  return searchButton;
}