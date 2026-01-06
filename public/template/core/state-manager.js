export class StateManager {
  constructor(config, authIntegration) {
    this.config = config;
    this.auth = authIntegration;
    this.state = {
      sidebar: {
        isOpen: this.loadSidebarState(),
        activeItem: null,
        expandedItems: [] // Ya no se usa, pero lo dejamos por compatibilidad
      },
      topBar: {
        isCompact: false,
        scrollY: 0
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
    // Ya no se usa, pero lo dejamos por si acaso
    try {
      const stored = localStorage.getItem('template:sidebar:expanded');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  saveExpandedItems() {
    // Ya no se usa
  }
  
  toggleSidebar() {
    const wasMobile = window.innerWidth < 750;
    
    this.state.sidebar.isOpen = !this.state.sidebar.isOpen;
    this.saveSidebarState();
    this.emit('sidebar:toggle', this.state.sidebar.isOpen);
    
    // En móvil, mostrar/ocultar overlay
    if (wasMobile) {
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) {
        if (this.state.sidebar.isOpen) {
          overlay.classList.add('sidebar-overlay--visible');
        } else {
          overlay.classList.remove('sidebar-overlay--visible');
        }
      }
    }
  }
  
  handleResize() {
    const isMobile = window.innerWidth < 750;
    const sidebar = document.getElementById('sidebar');
    
    if (!sidebar) return;
    
    if (isMobile) {
      // En móvil: añadir clase overlay
      sidebar.classList.add('sidebar--overlay');
      sidebar.classList.remove('sidebar--collapsed');
      
      // Si estaba abierto en desktop y cambió a móvil, cerrar
      if (this.state.sidebar.isOpen) {
        this.state.sidebar.isOpen = false;
        this.emit('sidebar:toggle', false);
      }
    } else {
      // En desktop: quitar clase overlay
      sidebar.classList.remove('sidebar--overlay');
      
      // Restaurar estado guardado
      const savedState = this.loadSidebarState();
      if (savedState !== this.state.sidebar.isOpen) {
        this.state.sidebar.isOpen = savedState;
        this.emit('sidebar:toggle', savedState);
      }
    }
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
      this.listeners.get(event).forEach(callback => callback(data));
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
  constructor(config, authIntegration) {
  this.config = config;
  this.auth = authIntegration;
  this.state = {
    sidebar: {
      isOpen: this.loadSidebarState(),
      activeItem: null,
      expandedItems: this.loadExpandedItems() // ← Cargar items expandidos
    },
    topBar: {
      isCompact: false,
      scrollY: 0
    },
    user: null
  };
  
  this.listeners = new Map();
  this.init();
}

loadExpandedItems() {
  try {
    const stored = localStorage.getItem('template:sidebar:expanded');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
}