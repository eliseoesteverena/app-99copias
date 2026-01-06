export class StateManager import { el } from '../../mount.js';

export function renderSidebarItem(item, state, isCollapsed) {
  const isActive = item.active || window.location.pathname === item.href;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  const isExpanded = state.state.sidebar.expandedItems.includes(item.id);

  const container = document.createElement('div');
  container.className = 'sidebar-item-container';
  container.setAttribute('data-item-id', item.id);

  // Item principal
  const itemElement = el(hasSubItems ? 'button' : 'a', {
    href: hasSubItems ? undefined : (item.href || '#'),
    class: [
      'sidebar-item',
      isActive && !hasSubItems ? 'sidebar-item--active' : '',
      hasSubItems && isExpanded ? 'sidebar-item--expanded' : ''
    ].filter(Boolean).join(' '),
    'data-tooltip': isCollapsed ? item.tooltip : null,
    onclick: (e) => {
      if (hasSubItems) {
        e.preventDefault();
        
        if (isCollapsed) {
          // En modo colapsado: mostrar tooltip con subitems
          showSubItemsTooltip(item, itemElement, state);
        } else {
          // En modo expandido: toggle normal
          toggleSubItems(item.id, container, state);
        }
      } else {
        if (!item.href || item.href === '#') {
          e.preventDefault();
        }
        if (window.innerWidth < 750) {
          state.toggleSidebar();
        }
      }
    }
  }, [
    el('span', { class: 'sidebar-item-icon' }, 
      typeof item.icon === 'string' ? item.icon : renderIcon(item.icon)
    ),
    el('span', { class: 'sidebar-item-label' }, item.label),
    hasSubItems ? el('span', { class: 'sidebar-item-arrow' }, '›') : null
  ].filter(Boolean));

  // Tooltip simple en colapsado (solo para items sin subitems)
  if (isCollapsed && item.tooltip && !hasSubItems) {
    itemElement.addEventListener('mouseenter', (e) => showTooltip(e, item.tooltip));
    itemElement.addEventListener('mouseleave', hideTooltip);
  }

  container.appendChild(itemElement);

  // Sub-items (solo visibles en modo expandido)
  if (hasSubItems) {
    const subItemsContainer = el('div', {
      class: 'sidebar-subitems',
      style: {
        display: isExpanded && !isCollapsed ? 'block' : 'none'
      }
    });

    item.subItems.forEach(subItem => {
      const subItemActive = window.location.pathname === subItem.href;
      
      const subItemEl = el('a', {
        href: subItem.href || '#',
        class: [
          'sidebar-item',
          'sidebar-subitem',
          subItemActive ? 'sidebar-item--active' : ''
        ].filter(Boolean).join(' '),
        onclick: (e) => {
          if (window.innerWidth < 750) {
            state.toggleSidebar();
          }
        }
      }, [
        subItem.icon ? el('span', { class: 'sidebar-item-icon' }, subItem.icon) : null,
        el('span', { class: 'sidebar-item-label' }, subItem.label)
      ].filter(Boolean));

      subItemsContainer.appendChild(subItemEl);
    });

    container.appendChild(subItemsContainer);
  }

  return container;
}

// Toggle sub-items en modo expandido
function toggleSubItems(itemId, container, state) {
  state.toggleExpandedItem(itemId);
  
  const subItemsEl = container.querySelector('.sidebar-subitems');
  const itemEl = container.querySelector('.sidebar-item');
  
  if (!subItemsEl || !itemEl) return;
  
  const isExpanded = state.isItemExpanded(itemId);
  
  if (isExpanded) {
    subItemsEl.style.display = 'block';
    itemEl.classList.add('sidebar-item--expanded');
  } else {
    subItemsEl.style.display = 'none';
    itemEl.classList.remove('sidebar-item--expanded');
  }
}

// Mostrar tooltip con sub-items en modo colapsado
function showSubItemsTooltip(item, triggerElement, state) {
  // Cerrar tooltip anterior si existe
  hideSubItemsTooltip();
  
  const rect = triggerElement.getBoundingClientRect();
  
  // Crear tooltip
  const tooltip = el('div', {
    class: 'subitems-tooltip',
    style: {
      position: 'fixed',
      left: `${rect.right + 10}px`,
      top: `${rect.top}px`,
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      minWidth: '200px',
      maxWidth: '250px',
      zIndex: '1500',
      padding: '0.5rem 0',
      opacity: '0',
      transform: 'translateX(-10px)',
      transition: 'opacity 0.15s ease, transform 0.15s ease'
    }
  }, [
    // Header con título del item padre
    el('div', {
      class: 'subitems-tooltip-header',
      style: {
        padding: '0.5rem 1rem',
        fontWeight: '600',
        fontSize: '0.875rem',
        color: '#111827',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '0.25rem'
      }
    }, item.label),
    
    // Sub-items
    ...item.subItems.map(subItem => {
      const isActive = window.location.pathname === subItem.href;
      
      return el('a', {
        href: subItem.href || '#',
        class: 'subitems-tooltip-item',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          color: isActive ? '#064e3b' : '#374151',
          backgroundColor: isActive ? '#d1fae5' : 'transparent',
          textDecoration: 'none',
          transition: 'background 0.2s',
          fontSize: '0.875rem',
          fontWeight: isActive ? '500' : '400'
        },
        onmouseover: (e) => {
          if (!isActive) {
            e.target.style.backgroundColor = '#f9fafb';
          }
        },
        onmouseout: (e) => {
          if (!isActive) {
            e.target.style.backgroundColor = 'transparent';
          }
        },
        onclick: (e) => {
          hideSubItemsTooltip();
          if (window.innerWidth < 750) {
            state.toggleSidebar();
          }
        }
      }, [
        subItem.icon ? el('span', { 
          style: { 
            fontSize: '1rem',
            flexShrink: '0',
            width: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          } 
        }, subItem.icon) : null,
        el('span', { style: { flex: '1' } }, subItem.label)
      ].filter(Boolean));
    })
  ]);
  
  document.body.appendChild(tooltip);
  
  // Animar entrada
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateX(0)';
  });
  
  // Guardar referencia
  window._activeSubItemsTooltip = tooltip;
  
  // Ajustar posición si se sale de la pantalla
  setTimeout(() => {
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Ajustar verticalmente si se sale por abajo
    if (tooltipRect.bottom > window.innerHeight) {
      const overflow = tooltipRect.bottom - window.innerHeight;
      tooltip.style.top = `${rect.top - overflow - 10}px`;
    }
    
    // Ajustar verticalmente si se sale por arriba
    if (tooltipRect.top < 64) { // 64px es la altura del topbar
      tooltip.style.top = '74px';
    }
    
    // Ajustar horizontalmente si se sale por la derecha
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
    }
  }, 0);
  
  // Cerrar al hacer click fuera
  setTimeout(() => {
    document.addEventListener('click', handleClickOutsideTooltip);
  }, 0);
}

function hideSubItemsTooltip() {
  if (window._activeSubItemsTooltip) {
    const tooltip = window._activeSubItemsTooltip;
    
    // Animar salida
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateX(-10px)';
    
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    }, 150);
    
    window._activeSubItemsTooltip = null;
    document.removeEventListener('click', handleClickOutsideTooltip);
  }
}

function handleClickOutsideTooltip(e) {
  if (window._activeSubItemsTooltip && 
      !window._activeSubItemsTooltip.contains(e.target) &&
      !e.target.closest('.sidebar-item')) {
    hideSubItemsTooltip();
  }
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

// Tooltip simple
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