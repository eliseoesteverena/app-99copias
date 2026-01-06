export class KeyboardNavigationHandler {
  constructor(state) {
    this.state = state;
    this.init();
  }
  
  init() {
    document.addEventListener('keydown', (e) => {
      // Esc: cerrar sidebar en móvil
      if (e.key === 'Escape') {
        if (window.innerWidth < 750 && this.state.state.sidebar.isOpen) {
          this.state.toggleSidebar();
        }
      }
      
      // Ctrl/Cmd + K: abrir búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (window.openSearchModal) {
          window.openSearchModal();
        }
      }
      
      // Ctrl/Cmd + B: toggle sidebar (solo desktop)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (window.innerWidth >= 750) {
          this.state.toggleSidebar();
        }
      }
    });
  }
}