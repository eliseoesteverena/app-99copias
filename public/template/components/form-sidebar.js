import { el } from '../../mount.js';

export function renderFormSidebar() {
  let contentContainer = null;
  let titleElement = null;
  let isOpen = false;
  
  // Función para cerrar el sidebar
  function closeSidebar() {
    overlay.classList.remove('form-sidebar-overlay--visible');
    sidebar.classList.remove('form-sidebar--open');
    document.body.style.overflow = '';
    isOpen = false;
  }
  
  // Overlay
  const overlay = el('div', {
    class: 'form-sidebar-overlay',
    onclick: closeSidebar
  });
  
  // Sidebar container
  const sidebar = el('div', {
    class: 'form-sidebar'
  }, [
    // Header
    el('div', {
      class: 'form-sidebar-header'
    }, [
      titleElement = el('h2', {
        class: 'form-sidebar-title'
      }, 'Título'),
      
      el('button', {
        class: 'form-sidebar-close',
        type: 'button',
        'aria-label': 'Cerrar',
        onclick: closeSidebar
      }, '×')
    ]),
    
    // Body (contenido dinámico)
    contentContainer = el('div', {
      class: 'form-sidebar-body'
    })
  ]);
  
  // ⬇️ ESCUCHAR EVENTO DE APERTURA
  document.addEventListener('formSidebar:open', (e) => {
    const { title, content } = e.detail;
    
    // Actualizar título
    if (titleElement && title) {
      titleElement.textContent = title;
    }
    
    // Actualizar contenido
    if (contentContainer && content) {
      contentContainer.innerHTML = '';
      contentContainer.appendChild(content);
    }
    
    // Abrir sidebar
    overlay.classList.add('form-sidebar-overlay--visible');
    sidebar.classList.add('form-sidebar--open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
  });
  
  // ⬇️ ESCUCHAR EVENTO DE CIERRE
  document.addEventListener('formSidebar:close', () => {
    closeSidebar();
  });
  
  // ⬇️ ESCUCHAR TECLA ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeSidebar();
      document.dispatchEvent(new CustomEvent('formSidebar:closed'));
    }
  });
  
  // Container que agrupa overlay + sidebar
  const container = el('div', {
    class: 'form-sidebar-container'
  }, [overlay, sidebar]);
  
  return container;
}