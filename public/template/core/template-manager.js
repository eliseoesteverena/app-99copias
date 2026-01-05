import { StateManager } from './state-manager.js';
import { renderTopBar } from '../components/topbar.js';
import { renderSidebar } from '../components/sidebar.js';
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
    this.root.appendChild(this.components.sidebar);
    
    // Main Content Container
    this.components.mainContent = el('main', {
      id: 'main-content',
      class: 'main-content',
      style: {
        marginTop: this.config.topBar.height,
        marginLeft: this.state.state.sidebar.isOpen ?
          this.config.settings.sidebarWidth.open :
          this.config.settings.sidebarWidth.collapsed,
        transition: 'margin-left 0.3s ease',
        minHeight: 'calc(100vh - ' + this.config.topBar.height + ')'
      }
    });
    
    this.root.appendChild(this.components.mainContent);
    
    // Overlay para móvil
    this.components.overlay = el('div', {
      class: 'sidebar-overlay',
      onclick: () => {
        if (window.innerWidth < this.config.settings.breakpoints.tablet) {
          this.state.toggleSidebar();
        }
      }
    });
    this.root.appendChild(this.components.overlay);
  }
  
  setupListeners() {
    // Sidebar toggle
    this.state.on('sidebar:toggle', (isOpen) => {
      this.updateMainContentMargin(isOpen);
      this.components.sidebar.classList.toggle('sidebar--collapsed', !isOpen);
      
      // Mostrar/ocultar overlay en móvil
      if (window.innerWidth < this.config.settings.breakpoints.tablet) {
        this.components.overlay.classList.toggle('sidebar-overlay--visible', isOpen);
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
    
    // Responsive
    this.setupResponsiveListeners();
  }
  
  setupResponsiveListeners() {
    const mediaQuery = window.matchMedia(
      `(max-width: ${this.config.settings.breakpoints.tablet - 1}px)`
    );
    
    const handleResize = (e) => {
      if (e.matches) {
        // Móvil: sidebar como overlay
        this.components.sidebar.classList.add('sidebar--overlay');
        if (this.state.state.sidebar.isOpen) {
          this.components.overlay.classList.add('sidebar-overlay--visible');
        }
      } else {
        // Desktop: sidebar fijo
        this.components.sidebar.classList.remove('sidebar--overlay');
        this.components.overlay.classList.remove('sidebar-overlay--visible');
      }
    };
    
    mediaQuery.addEventListener('change', handleResize);
    handleResize(mediaQuery); // Ejecutar inmediatamente
  }
  
  initUtilities() {
    // Scroll observer
    import('./utils/scroll-observer.js').then(module => {
      new module.ScrollObserver(this.state, this.config.topBar.scrollBehavior.threshold);
    });
    
    // Touch gestures (solo móvil)
    if ('ontouchstart' in window) {
      import('./utils/touch-gestures.js').then(module => {
        new module.TouchGestureHandler(document.body, {
          onSwipeRight: () => {
            if (window.innerWidth < this.config.settings.breakpoints.tablet) {
              if (!this.state.state.sidebar.isOpen) {
                this.state.toggleSidebar();
              }
            }
          },
          onSwipeLeft: () => {
            if (window.innerWidth < this.config.settings.breakpoints.tablet) {
              if (this.state.state.sidebar.isOpen) {
                this.state.toggleSidebar();
              }
            }
          }
        });
      });
    }
    
    // Keyboard navigation
    import('./utils/keyboard-nav.js').then(module => {
      new module.KeyboardNavigationHandler(this.state);
    });
  }
  
  updateMainContentMargin(isOpen) {
    // No aplicar margin en móvil (sidebar es overlay)
    if (window.innerWidth < this.config.settings.breakpoints.tablet) {
      this.components.mainContent.style.marginLeft = '0';
      return;
    }
    
    const margin = isOpen ?
      this.config.settings.sidebarWidth.open :
      this.config.settings.sidebarWidth.collapsed;
    
    this.components.mainContent.style.marginLeft = margin;
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
  
  showLoading(message = 'Cargando...') {
    const spinner = el('div.loading-overlay', {
      style: {
        position: 'fixed',
        inset: '0',
        background: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999'
      }
    }, [
      el('div.text-center', {}, [
        el('div.loading-spinner', {}),
        el('p.mt-4', {}, message)
      ])
    ]);
    
    document.body.appendChild(spinner);
    return spinner;
  }
  
  hideLoading(spinner) {
    if (spinner && spinner.parentNode) {
      spinner.parentNode.removeChild(spinner);
    }
  }
}