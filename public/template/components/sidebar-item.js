import { el } from '../../mount.js';

export function renderSidebarItem(item, state, isCollapsed) {
  const isActive = item.active || window.location.pathname === item.href;
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  // Verificar si este item está expandido
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
        toggleSubItems(item.id, container, state);
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
  
  // Tooltip en colapsado
  if (isCollapsed && item.tooltip) {
    itemElement.addEventListener('mouseenter', (e) => showTooltip(e, item.tooltip));
    itemElement.addEventListener('mouseleave', hideTooltip);
  }
  
  // Tooltip en mobil
  if (isMobile && item.tooltip) {
    itemElement.addEventListener('mouseenter', (e) => hideTooltip(e, item.tooltip));
    itemElement.addEventListener('mouseleave', hideTooltip);
  }
  
  container.appendChild(itemElement);
  
  // Sub-items (inicialmente ocultos, se muestran al expandir)
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
        'data-tooltip': isCollapsed ? subItem.label : null,
        onclick: (e) => {
          if (window.innerWidth < 750) {
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
      
      subItemsContainer.appendChild(subItemEl);
    });
    
    container.appendChild(subItemsContainer);
  }
  
  return container;
}

function toggleSubItems(itemId, container, state) {
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
  
  // Guardar estado (opcional)
  localStorage.setItem(
    'template:sidebar:expanded',
    JSON.stringify(state.state.sidebar.expandedItems)
  );
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