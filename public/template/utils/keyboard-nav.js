export class KeyboardNavigationHandler {
  constructor(state) {
    this.state = state;
    this.init();
  }
  
  init() {
    document.addEventListener('keydown', (e) => {
      // Esc: cerrar sidebar en móvil
      if (e.key === 'Escape') {
        if (window.innerWidth < 768 && this.state.state.sidebar.isOpen) {
          this.state.toggleSidebar();
        }
      }
      
      // Ctrl/Cmd + K: foco en búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.topbar-search input');
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl/Cmd + B: toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.state.toggleSidebar();
      }
    });
  }
}