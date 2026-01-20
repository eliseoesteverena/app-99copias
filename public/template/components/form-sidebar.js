import { el } from '../../mount.js';

export function renderFormSidebar(stateManager) {
  let contentContainer = null;
  let titleElement = null;

  // 1. Overlay usando selector CSS directo
  const overlay = el('div.form-sidebar-overlay', {
    onclick: () => stateManager.closeFormSidebar()
  });

  // 2. Estructura del Sidebar con anidamiento declarativo
  const sidebar = el('div.form-sidebar', {}, [
    // Header con clases en el selector
    el('div.form-sidebar-header', {}, [
      titleElement = el('h2.form-sidebar-title', {}, 'Título'),
      
      el('button.form-sidebar-close', {
        type: 'button',
        'aria-label': 'Cerrar',
        onclick: () => stateManager.closeFormSidebar()
      }, '×')
    ]),

    // Body (contenido dinámico)
    contentContainer = el('div.form-sidebar-body')
  ]);

  // --- Lógica de estados (se mantiene igual para evitar conflictos) ---

  stateManager.on('formSidebar:updateContent', ({ title, content }) => {
    if (titleElement && title) {
      titleElement.textContent = title;
    }
    
    if (contentContainer && content) {
      contentContainer.innerHTML = ''; // Limpieza estándar recomendada en los ejemplos
      contentContainer.appendChild(content);
    }
  });

  stateManager.on('formSidebar:toggle', ({ isOpen }) => {
    if (isOpen) {
      overlay.classList.add('form-sidebar-overlay--visible');
      sidebar.classList.add('form-sidebar--open');
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.remove('form-sidebar-overlay--visible');
      sidebar.classList.remove('form-sidebar--open');
      document.body.style.overflow = '';
    }
  });

  // 3. Container final unificando las piezas
  return el('div.form-sidebar-container', {}, [overlay, sidebar]);
}
