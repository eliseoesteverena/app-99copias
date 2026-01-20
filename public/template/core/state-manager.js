export class StateManager {
  constructor(config, authIntegration) {
    this.config = config;
    this.auth = authIntegration;
    this.state = {
      sidebar: {
        isOpen: this.loadSidebarState(),
        activeItem: null,
        expandedItems: this.loadExpandedItems()
      },
      topBar: {
        isCompact: false,
        scrollY: 0
      },
      formSidebar: { 
        isOpen: false
      },
      user: null
    };
    
    this.listeners = new Map();
    this.init();
  }
  
  init() {
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', () => this.handleResize());
  }
  
  loadSidebarState() {
    // En móvil (< 750px), siempre cerrado por defecto
    if (window.innerWidth < 750) {
      return false;
    }
    
    // En desktop, cargar preferencia guardada
    if (!this.config.settings.sidebarPersistence) {
      return this.config.settings.sidebarDefaultState === 'open';
    }
    
    const stored = localStorage.getItem('template:sidebar:state');
    return stored !== null ? JSON.parse(stored) : true;
  }
  
  saveSidebarState() {
    // Solo guardar en desktop
    if (window.innerWidth >= 750 && this.config.settings.sidebarPersistence) {
      localStorage.setItem(
        'template:sidebar:state',
        JSON.stringify(this.state.sidebar.isOpen)
      );
    }
  }
  
  loadExpandedItems() {
    try {
      const stored = localStorage.getItem('template:sidebar:expanded');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  saveExpandedItems() {
    try {
      localStorage.setItem(
        'template:sidebar:expanded',
        JSON.stringify(this.state.sidebar.expandedItems)
      );
    } catch (error) {
      console.error('Error guardando items expandidos:', error);
    }
  }
  
  toggleSidebar() {
    const isMobile = window.innerWidth < 750;
    
    this.state.sidebar.isOpen = !this.state.sidebar.isOpen;
    this.saveSidebarState();
    this.emit('sidebar:toggle', { isOpen: this.state.sidebar.isOpen, isMobile });
  }
  // Métodos para FormSidebar
  openFormSidebar(title, content) {
    this.state.formSidebar.isOpen = true;
    
    this.emit('formSidebar:updateContent', { title, content });
    this.emit('formSidebar:toggle', { isOpen: true });
  }
  
  closeFormSidebar() {
    this.state.formSidebar.isOpen = false;
    this.emit('formSidebar:toggle', { isOpen: false });
  }
  
  toggleFormSidebar() {
    if (this.state.formSidebar.isOpen) {
      this.closeFormSidebar();
    } else {
      this.openFormSidebar();
    }
  }
  
  handleResize() {
    const isMobile = window.innerWidth < 750;
    const wasMobile = this.state._wasMobile !== undefined ? this.state._wasMobile : isMobile;
    
    // Solo actuar si cambió de móvil a desktop o viceversa
    if (isMobile !== wasMobile) {
      this.state._wasMobile = isMobile;
      
      if (isMobile) {
        // Cambió a móvil: cerrar sidebar si estaba abierto
        if (this.state.sidebar.isOpen) {
          this.state.sidebar.isOpen = false;
          this.emit('sidebar:toggle', { isOpen: false, isMobile: true });
        }
      } else {
        // Cambió a desktop: restaurar estado guardado
        const savedState = this.loadSidebarState();
        if (savedState !== this.state.sidebar.isOpen) {
          this.state.sidebar.isOpen = savedState;
          this.emit('sidebar:toggle', { isOpen: savedState, isMobile: false });
        }
      }
    }
  }
  
  setActiveItem(itemId) {
    this.state.sidebar.activeItem = itemId;
    this.emit('sidebar:active-changed', itemId);
  }
  
  toggleExpandedItem(itemId) {
    const index = this.state.sidebar.expandedItems.indexOf(itemId);
    
    if (index > -1) {
      // Cerrar
      this.state.sidebar.expandedItems.splice(index, 1);
    } else {
      // Abrir
      this.state.sidebar.expandedItems.push(itemId);
    }
    
    this.saveExpandedItems();
    this.emit('sidebar:expanded-changed', this.state.sidebar.expandedItems);
  }
  
  isItemExpanded(itemId) {
    return this.state.sidebar.expandedItems.includes(itemId);
  }
  
  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }
  
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
  
  // Método para limpiar todos los listeners (útil para cleanup)
  removeAllListeners() {
    this.listeners.clear();
  }
  
  // Método para obtener el estado actual (útil para debugging)
  getState() {
    return {
      ...this.state,
      isMobile: window.innerWidth < 750
    };
  }
  
      openFormSidebar(title, content) {
      this.state.formSidebar.isOpen = true;
      this.emit('formSidebar:updateContent', { title, content });
      this.emit('formSidebar:toggle', { isOpen: true });
    }
    
    closeFormSidebar() {
      this.state.formSidebar.isOpen = false;
      this.emit('formSidebar:toggle', { isOpen: false });
    }
    
    toggleFormSidebar() {
      if (this.state.formSidebar.isOpen) {
        this.closeFormSidebar();
      } else {
        this.openFormSidebar();
      }
    }
  
}