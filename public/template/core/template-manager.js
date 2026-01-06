import { StateManager } from './state-manager.js';
import { renderTopBar } from '../components/topbar.js';
import { renderSidebar } from '../components/sidebar.js';
import { createSearchModal } from '../components/search-modal.js';
import { el } from '../../mount.js';

export class TemplateManager {
  constructor(config, authIntegration) {
    this.config = config;
    this.auth = authIntegration;
    this.state = new StateManager(config, authIntegration);
    this.components = {};
    this.root = null;
  }
  
  async init(rootElement) {
    this.root = rootElement;
    
    // Actualizar config con datos de usuario
    this.updateConfigWithUserData();
    
    // Renderizar componentes
    this.render();
    
    // Configurar listeners
    this.setupListeners();
    
    // Inicializar utilidades
    this.initUtilities();
    
    // Pre-crear modal de búsqueda (no se muestra hasta que se llame)
    createSearchModal();
  }
  
  updateConfigWithUserData() {
    const userData = this.auth.getUserData();
    
    if (userData) {
      this.config.topBar.user.name = userData.name;
      this.config.topBar.user.avatar = userData.avatar;
    }
  }
  
  render() {
  this.root.innerHTML = '';
  
  // TopBar
  this.components.topBar = renderTopBar(this.config.topBar, this.state, this.auth);
  this.root.appendChild(this.components.topBar);
  
  // Sidebar
  this.components.sidebar = renderSidebar(this.config.sidebar, this.state);
  
  // Aplicar clases iniciales según dispositivo
  const isMobile = window.innerWidth < 750;
  
  if (isMobile) {
    // En móvil, empezar cerrado
    if (!this.state.state.sidebar.isOpen) {
      this.components.sidebar.classList.remove('sidebar--mobile-open');
    } else {
      this.components.sidebar.classList.add('sidebar--mobile-open');
    }
  } else {
    // En desktop, aplicar collapsed si corresponde
    if (!this.state.state.sidebar.isOpen) {
      this.components.sidebar.classList.add('sidebar--collapsed');
    }
  }
  
  this.root.appendChild(this.components.sidebar);
  
  // Main Content Container
  this.components.mainContent = el('main', {
    id: 'main-content',
    class: 'main-content',
    style: {
      marginLeft: isMobile ? '0' : (this.state.state.sidebar.isOpen ?
        this.config.settings.sidebarWidth.open :
        this.config.settings.sidebarWidth.collapsed)
    }
  });
  
  this.root.appendChild(this.components.mainContent);
  
  // Overlay para móvil
  this.components.overlay = el('div', {
    class: 'sidebar-overlay',
    onclick: (e) => {
      e.stopPropagation();
      if (window.innerWidth < 750) {
        this.state.toggleSidebar();
      }
    }
  });
  this.root.appendChild(this.components.overlay);
}
  setupListeners() {
  // Sidebar toggle
  this.state.on('sidebar:toggle', ({ isOpen, isMobile }) => {
    const sidebar = this.components.sidebar;
    
    if (isMobile) {
      // En móvil: usar clase especial para mostrar/ocultar
      if (isOpen) {
        sidebar.classList.add('sidebar--mobile-open');
        sidebar.classList.remove('sidebar--collapsed');
      } else {
        sidebar.classList.remove('sidebar--mobile-open');
      }
      
      // Mostrar/ocultar overlay
      this.components.overlay.classList.toggle('sidebar-overlay--visible', isOpen);
      
      // En móvil, main content siempre en 0
      this.components.mainContent.style.marginLeft = '0';
    } else {
      // En desktop: usar collapsed class
      sidebar.classList.remove('sidebar--mobile-open');
      sidebar.classList.toggle('sidebar--collapsed', !isOpen);
      
      // Ajustar margen del main content
      this.updateMainContentMargin(isOpen);
      
      // Overlay siempre oculto en desktop
      this.components.overlay.classList.remove('sidebar-overlay--visible');
    }
  });

  // TopBar scroll
  this.state.on('topbar:scroll', ({ isCompact }) => {
    this.components.topBar.classList.toggle('topbar--compact', isCompact);
  });

  // Logout
  this.state.on('user:logout', async () => {
    await this.auth.logout();
  });
}

  updateMainContentMargin(isOpen) {
  // En móvil, sin margen
  if (window.innerWidth < 750) {
    this.components.mainContent.style.marginLeft = '0';
    return;
  }
  
  // En desktop, ajustar según estado
  const margin = isOpen ?
    this.config.settings.sidebarWidth.open :
    this.config.settings.sidebarWidth.collapsed;
  
  this.components.mainContent.style.marginLeft = margin;
}
  
  initUtilities() {
    // Scroll observer
    import('/template/utils/scroll-observer.js').then(module => {
      new module.ScrollObserver(this.state, this.config.topBar.scrollBehavior.threshold);
    }).catch(err => {
      console.error('❌ Error cargando scroll-observer:', err);
    });
    
    // Touch gestures (solo móvil)
    if ('ontouchstart' in window && window.innerWidth < 750) {
      import('/template/utils/touch-gestures.js').then(module => {
        new module.TouchGestureHandler(document.body, {
          onSwipeRight: () => {
            if (!this.state.state.sidebar.isOpen) {
              this.state.toggleSidebar();
            }
          },
          onSwipeLeft: () => {
            if (this.state.state.sidebar.isOpen) {
              this.state.toggleSidebar();
            }
          }
        });
      }).catch(err => {
        console.error('❌ Error cargando touch-gestures:', err);
      });
    }
    
    // Keyboard navigation
    import('/template/utils/keyboard-nav.js').then(module => {
      new module.KeyboardNavigationHandler(this.state);
    }).catch(err => {
      console.error('❌ Error cargando keyboard-nav:', err);
    });
  }
  
  // API pública
  setPageTitle(title) {
    this.config.topBar.title.text = title;
    const titleEl = this.components.topBar.querySelector('.topbar-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
    document.title = `${title} - Mi SaaS`;
  }
  
  addSidebarItem(item, position = -1) {
    if (position === -1) {
      this.config.sidebar.items.push(item);
    } else {
      this.config.sidebar.items.splice(position, 0, item);
    }
    this.rerenderSidebar();
  }
  
  removeSidebarItem(itemId) {
    this.config.sidebar.items = this.config.sidebar.items.filter(
      item => item.id !== itemId
    );
    this.rerenderSidebar();
  }
  
  updateSidebarItem(itemId, updates) {
    const item = this.config.sidebar.items.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      this.rerenderSidebar();
    }
  }
  
  rerenderSidebar() {
    const oldSidebar = this.components.sidebar;
    this.components.sidebar = renderSidebar(this.config.sidebar, this.state);
    oldSidebar.replaceWith(this.components.sidebar);
  }
}