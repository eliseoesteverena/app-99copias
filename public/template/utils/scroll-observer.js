export class ScrollObserver {
  constructor(state, threshold) {
    this.state = state;
    this.threshold = threshold;
    this.ticking = false;
    
    this.init();
  }
  
  init() {
    window.addEventListener('scroll', () => {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.handleScroll();
          this.ticking = false;
        });
        
        this.ticking = true;
      }
    });
  }
  
  handleScroll() {
    const scrollY = window.scrollY;
    const shouldCompact = scrollY > this.threshold;
    
    if (shouldCompact !== this.state.state.topBar.isCompact) {
      this.state.state.topBar.isCompact = shouldCompact;
      this.state.state.topBar.scrollY = scrollY;
      this.state.emit('topbar:scroll', { isCompact: shouldCompact, scrollY });
    }
  }
}