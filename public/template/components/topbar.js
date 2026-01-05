import { el } from '../../mount.js';
import { renderSearchBar } from './search-bar.js';
import { renderUserDropdown } from './user-dropdown.js';

export function renderTopBar(config, state, auth) {
  const topbar = el('header', {
    class: 'topbar',
    id: 'topbar'
  }, [
    // Left section
    el('div', { class: 'topbar-left' }, [
      // Hamburger button
      el('button', {
        class: 'topbar-hamburger',
        'aria-label': 'Toggle menu',
        onclick: () => state.toggleSidebar()
      }, [
        el('span', { style: { fontSize: '1.5rem' } }, '☰')
      ]),
      
      // Page title
      el('h1', { class: 'topbar-title' }, config.title.text)
    ]),
    
    // Right section
    el('div', { class: 'topbar-right' }, [
      // Search bar
      config.search.enabled ? renderSearchBar(config.search, state) : null,
      
      // Notifications
      config.notifications.enabled ? el('button', {
        'aria-label': 'Notificaciones',
        onclick: config.notifications.onClick || (() => {
          alert('Funcionalidad de notificaciones próximamente');
        })
      }, [
        el('span', { style: { fontSize: '1.25rem' } }, '🔔'),
        config.notifications.badge > 0 ?
        el('span', { class: 'notification-badge' }, config.notifications.badge.toString()) :
        null
      ].filter(Boolean)) : null,
      
      // User dropdown
      config.user ? renderUserDropdown(config.user, state, auth) : null
    ].filter(Boolean))
  ]);
  
  return topbar;
}