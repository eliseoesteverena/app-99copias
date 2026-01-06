export class StateManager export class StateManager {
  constructor(config, authIntegration) {
    this.config = config;
    this.auth = authIntegration;
    this.state = {
      sidebar: {
        isOpen: this.loadSidebarState(),
        activeItem: null,
        expandedItems: []
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
  
  toggleSidebar() {
    const isMobile = window.innerWidth < 750;
    
    this.state.sidebar.isOpen = !this.state.sidebar.isOpen;
    this.saveSidebarState();
    this.emit('sidebar:toggle', { isOpen: this.state.sidebar.isOpen, isMobile });
  }
  
  handleResize() {
    const isMobile = window.innerWidth < 750;
    const sidebar = document.getElementById('sidebar');
    
    if (!sidebar) return;
    
    if (isMobile) {
      // En móvil: cerrar sidebar si estaba abierto
      if (this.state.sidebar.isOpen) {
        this.state.sidebar.isOpen = false;
        this.emit('sidebar:toggle', { isOpen: false, isMobile: true });
      }
    } else {
      // En desktop: restaurar estado guardado
      const savedState = this.loadSidebarState();
      if (savedState !== this.state.sidebar.isOpen) {
        this.state.sidebar.isOpen = savedState;
        this.emit('sidebar:toggle', { isOpen: savedState, isMobile: false });
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
}