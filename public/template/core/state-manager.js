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
      user: null
    };
    
    this.listeners = new Map();
  }
  
  loadSidebarState() {
    if (!this.config.settings.sidebarPersistence) {
      return this.config.settings.sidebarDefaultState === 'open';
    }
    const stored = localStorage.getItem('template:sidebar:state');
    return stored !== null ? JSON.parse(stored) : true;
  }
  
  saveSidebarState() {
    if (this.config.settings.sidebarPersistence) {
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
    localStorage.setItem(
      'template:sidebar:expanded',
      JSON.stringify(this.state.sidebar.expandedItems)
    );
  }
  
  toggleSidebar() {
    this.state.sidebar.isOpen = !this.state.sidebar.isOpen;
    this.saveSidebarState();
    this.emit('sidebar:toggle', this.state.sidebar.isOpen);
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