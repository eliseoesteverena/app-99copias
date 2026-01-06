import { el } from '../../mount.js';

export function renderSidebarItem(item, state, isCollapsed) {
  const isActive = item.active || window.location.pathname === item.href;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  const container = document.createElement('div');
  container.className = 'sidebar-item-container';
  
  // Item principal (solo si tiene href o NO tiene subitems)
  if (!hasSubItems || item.href) {
    const itemElement = el('a', {
      href: item.href || '#',
      class: ['sidebar-item', isActive ? 'sidebar-item--active' : ''].filter(Boolean).join(' '),
      'data-tooltip': isCollapsed ? item.tooltip : null,
      onclick: (e) => {
        if (!item.href || item.href === '#') {
          e.preventDefault();
        }
        if (window.innerWidth < 768) {
          state.toggleSidebar();
        }
      }
    }, [
      el('span', { class: 'sidebar-item-icon' },
        typeof item.icon === 'string' ? item.icon : renderIcon(item.icon)
      ),
      el('span', { class: 'sidebar-item-label' }, item.label)
    ]);
    
    // Tooltip en colapsado
    if (isCollapsed) {
      itemElement.addEventListener('mouseenter', (e) => showTooltip(e, item.tooltip));
      itemElement.addEventListener('mouseleave', hideTooltip);
    }
    
    container.appendChild(itemElement);
  }
  
  // Sub-items (siempre visibles)
  if (hasSubItems) {
    item.subItems.forEach(subItem => {
      const subItemActive = window.location.pathname === subItem.href;
      
      const subItemEl = el('a', {
        href: subItem.href || '#',
        class: [
          'sidebar-item',
          'sidebar-subitem',
          subItemActive ? 'sidebar-item--active' : ''
        ].filter(Boolean).join(' '),
        'data-tooltip': isCollapsed ? subItem.label : null,
        onclick: (e) => {
          if (window.innerWidth < 768) {
            state.toggleSidebar();
          }
        }
      }, [
        subItem.icon ? el('span', { class: 'sidebar-item-icon' }, subItem.icon) : null,
        el('span', { class: 'sidebar-item-label' }, subItem.label)
      ].filter(Boolean));
      
      // Tooltip en colapsado
      if (isCollapsed) {
        subItemEl.addEventListener('mouseenter', (e) => showTooltip(e, subItem.label));
        subItemEl.addEventListener('mouseleave', hideTooltip);
      }
      
      container.appendChild(subItemEl);
    });
  }
  
  return container;
}

function renderIcon(iconConfig) {
  if (!iconConfig) return '';
  
  if (typeof iconConfig === 'string') {
    return iconConfig;
  }
  
  if (iconConfig.type === 'svg') {
    const temp = document.createElement('div');
    temp.innerHTML = iconConfig.content;
    return temp.firstChild;
  }
  
  return iconConfig.content || '';
}

// Tooltip helpers
let activeTooltip = null;

function showTooltip(event, text) {
  hideTooltip();
  
  const rect = event.currentTarget.getBoundingClientRect();
  
  activeTooltip = el('div', {
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
  }, text);
  
  document.body.appendChild(activeTooltip);
}

function hideTooltip() {
  if (activeTooltip && activeTooltip.parentNode) {
    activeTooltip.parentNode.removeChild(activeTooltip);
    activeTooltip = null;
  }
}