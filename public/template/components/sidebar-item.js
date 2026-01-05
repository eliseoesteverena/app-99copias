import { el } from '../../mount.js';

export function renderSidebarItem(item, state, isCollapsed) {
  const isActive = item.active || window.location.pathname === item.href;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isExpanded = state.state.sidebar.expandedItems.includes(item.id);
  
  // Contenedor del item + subitems
  const container = document.createElement('div');
  container.className = 'sidebar-item-container';
  
  // Item principal
  const itemElement = el(hasSubItems ? 'div' : 'a', {
    href: hasSubItems ? undefined : (item.href || '#'),
    class: [
      'sidebar-item',
      isActive ? 'sidebar-item--active' : '',
      hasSubItems && isExpanded ? 'sidebar-item--expanded' : ''
    ].filter(Boolean).join(' '),
    'data-tooltip': item.tooltip,
    'data-item-id': item.id,
    onclick: (e) => {
      if (hasSubItems) {
        e.preventDefault();
        toggleSubItems(item.id, container);
      } else if (window.innerWidth < 768) {
        state.toggleSidebar();
      }
    }
  }, [
    // Icon
    el('span', { class: 'sidebar-item-icon' },
      typeof item.icon === 'string' ? item.icon : renderIcon(item.icon)
    ),
    
    // Label
    el('span', { class: 'sidebar-item-label' }, item.label),
    
    // Arrow para subitems
    hasSubItems ? el('span', { class: 'sidebar-item-arrow' }, '›') : null
  ].filter(Boolean));
  
  container.appendChild(itemElement);
  
  // SubItems container
  if (hasSubItems) {
    const subItemsContainer = el('div', {
      class: 'sidebar-subitems',
      style: {
        display: isExpanded ? 'block' : 'none'
      }
    });
    
    // Crear cada subitem individualmente
    item.subItems.forEach(subItem => {
      const subItemEl = el('a', {
        href: subItem.href || '#',
        class: 'sidebar-item sidebar-subitem',
        style: {
          display: 'flex', // ← CRITICAL: Asegurar que sea flex block
          width: '100%' // ← CRITICAL: Ancho completo
        },
        onclick: (e) => {
          if (window.innerWidth < 768) {
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
  
  // Tooltip para modo colapsado
  if (isCollapsed && item.tooltip) {
    itemElement.addEventListener('mouseenter', (e) => showTooltip(e, item.tooltip));
    itemElement.addEventListener('mouseleave', hideTooltip);
  }
  
  function toggleSubItems(itemId, container) {
    const subItemsEl = container.querySelector('.sidebar-subitems');
    const itemEl = container.querySelector('.sidebar-item');
    
    if (!subItemsEl) return;
    
    const isCurrentlyExpanded = state.state.sidebar.expandedItems.includes(itemId);
    
    if (isCurrentlyExpanded) {
      // Cerrar
      state.state.sidebar.expandedItems = state.state.sidebar.expandedItems.filter(id => id !== itemId);
      subItemsEl.style.display = 'none';
      itemEl.classList.remove('sidebar-item--expanded');
    } else {
      // Abrir
      state.state.sidebar.expandedItems.push(itemId);
      subItemsEl.style.display = 'block';
      itemEl.classList.add('sidebar-item--expanded');
    }
    
    // Guardar estado
    state.saveExpandedItems();
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