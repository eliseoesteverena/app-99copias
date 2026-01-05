export class TouchGestureHandler {
  constructor(element, callbacks = {}) {
    this.element = element;
    this.callbacks = callbacks;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.minSwipeDistance = 50;
    
    this.init();
  }
  
  init() {
    this.element.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    this.element.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, { passive: true });
  }
  
  handleSwipe() {
    const distance = this.touchEndX - this.touchStartX;
    
    if (Math.abs(distance) < this.minSwipeDistance) return;
    
    if (distance > 0 && this.callbacks.onSwipeRight) {
      this.callbacks.onSwipeRight();
    } else if (distance < 0 && this.callbacks.onSwipeLeft) {
      this.callbacks.onSwipeLeft();
    }
  }
}