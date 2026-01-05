import { el } from '../../mount.js';
import { renderSidebarItem } from './sidebar-item.js';
import { renderSidebarFooter } from './sidebar-footer.js';

export function renderSidebar(config, state) {
  const isCollapsed = !state.state.sidebar.isOpen;
  const isMobile = window.innerWidth < 768;
  
  // Construir clases CSS correctamente
  const classes = ['sidebar'];
  
  if (isCollapsed) {
    classes.push('sidebar--collapsed');
  }
  
  if (isMobile) {
    classes.push('sidebar--overlay');
  }
  
  const sidebar = el('aside', {
    id: 'sidebar',
    class: classes.join(' '), // ← CORRECCIÓN: unir todas las clases
    'aria-label': 'Menú de navegación'
  }, [
    // Sidebar content
    el('nav.sidebar-content', {
      'aria-label': 'Menú principal'
    }, config.items.map(item => renderSidebarItem(item, state, isCollapsed))),
    
    // Sidebar footer
    config.footer && config.footer.enabled && !(isCollapsed && config.footer.hideWhenCollapsed) ?
    renderSidebarFooter(config.footer, state) :
    null
  ].filter(Boolean));
  
  return sidebar;
}