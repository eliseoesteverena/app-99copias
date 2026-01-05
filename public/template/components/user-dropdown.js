import { el } from '../../mount.js';

export function renderUserDropdown(userConfig, state, auth) {
  let dropdownOpen = false;
  
  const userContainer = el('div', {
    class: 'topbar-user',
    style: { position: 'relative' }
  });
  
  // User trigger (avatar + name)
  const userData = auth.getUserData();
  
  const userTrigger = el('div', {
    class: 'user-trigger',
    onclick: (e) => {
      e.stopPropagation();
      dropdownOpen = !dropdownOpen;
      updateDropdown();
    }
  }, [
    el('img', {
      class: 'user-avatar',
      src: userData.avatar,
      alt: userData.name,
      onerror: (e) => {
        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=064e3b&color=fff`;
      }
    }),
    el('span', {
      class: 'user-name',
      style: {
        fontSize: '0.875rem',
        display: window.innerWidth < 640 ? 'none' : 'block'
      }
    }, userData.name)
  ]);
  console.log(userData.name)
  // Dropdown menu
  const dropdown = el('div', {
    class: 'user-dropdown',
    id: 'user-dropdown',
    style: {
      display: 'none' // Oculto por defecto
    }
  });
  
  // Crear cada item del dropdown individualmente
  userConfig.dropdown.forEach(item => {
    if (item.type === 'divider') {
      const divider = el('div', { class: 'user-dropdown-divider' });
      dropdown.appendChild(divider);
      return;
    }
    
    const dropdownItem = el('a', {
      href: item.href || '#',
      class: [
        'user-dropdown-item',
        item.variant === 'danger' ? 'user-dropdown-item--danger' : ''
      ].filter(Boolean).join(' '),
      style: {
        display: 'flex', // ← CRITICAL
        width: '100%' // ← CRITICAL
      },
      onclick: (e) => {
        if (item.action === 'logout') {
          e.preventDefault();
          handleLogout();
        } else if (item.href === '#') {
          e.preventDefault();
        }
        dropdownOpen = false;
        updateDropdown();
      }
    }, [
      el('span', { class: 'user-dropdown-icon' }, item.icon),
      el('span', { class: 'user-dropdown-label' }, item.label)
    ]);
    
    dropdown.appendChild(dropdownItem);
  });
  
  function updateDropdown() {
    if (dropdownOpen) {
      dropdown.style.display = 'block';
      dropdown.classList.add('user-dropdown--open');
    } else {
      dropdown.style.display = 'none';
      dropdown.classList.remove('user-dropdown--open');
    }
  }
  
  async function handleLogout() {
    const confirmed = confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (confirmed) {
      state.emit('user:logout');
    }
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdownOpen && !userContainer.contains(e.target)) {
      dropdownOpen = false;
      updateDropdown();
    }
  });
  
  userContainer.appendChild(userTrigger);
  userContainer.appendChild(dropdown);
  
  return userContainer;
}