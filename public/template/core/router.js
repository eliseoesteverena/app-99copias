export class Router {
  constructor(routes, authIntegration) {
    this.routes = routes;
    this.auth = authIntegration;
    this.currentRoute = null;
    this.contentContainer = null;
    
    this.init();
  }
  
  init() {
    // Escuchar cambios en el hash
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    // Cargar ruta inicial
    this.handleRouteChange();
  }
  
  async handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/'; // Quitar el #
    const route = this.findRoute(hash);
    
    console.log('📍 Navegando a:', hash);
    
    if (!route) {
      console.warn('⚠️ Ruta no encontrada:', hash);
      this.navigateTo('/dashboard'); // Fallback
      return;
    }
    
    // Verificar autenticación
    if (route.requiresAuth) {
      const userData = await this.auth.getUserData();
      
      if (!userData) {
        console.log('🔒 Ruta protegida, redirigiendo a login');
        this.navigateTo('/login', false); // false = no verificar auth
        return;
      }
    }
    
    // Verificar permisos
    if (route.permissions && route.permissions.length > 0) {
      const hasPermission = await this.auth.checkPermissions(route.permissions);
      
      if (!hasPermission) {
        console.log('🚫 Sin permisos para esta ruta');
        this.navigateTo('/dashboard');
        return;
      }
    }
    
    // Ejecutar beforeEnter hook
    if (route.beforeEnter) {
      const canEnter = await route.beforeEnter();
      if (!canEnter) {
        this.navigateTo('/dashboard');
        return;
      }
    }
    
    // Renderizar la página
    this.currentRoute = route;
    await this.renderPage(route);
    
    // Actualizar sidebar activo
    this.updateActiveSidebarItem(route.path);
    
    // Actualizar título
    this.updatePageTitle(route.title);
  }
  
  findRoute(path) {
    // Buscar ruta exacta
    let route = this.routes.find(r => r.path === path);
    
    if (!route) {
      // Buscar ruta con parámetros (/ventas/:id)
      route = this.routes.find(r => {
        const pattern = new RegExp('^' + r.path.replace(/:\w+/g, '([^/]+)') + '$');
        return pattern.test(path);
      });
      
      if (route) {
        // Extraer parámetros
        const pattern = new RegExp('^' + route.path.replace(/:\w+/g, '([^/]+)') + '$');
        const matches = path.match(pattern);
        route.params = this.extractParams(route.path, matches);
      }
    }
    
    return route;
  }
  
  extractParams(routePath, matches) {
    const paramNames = routePath.match(/:\w+/g) || [];
    const params = {};
    
    paramNames.forEach((paramName, index) => {
      params[paramName.slice(1)] = matches[index + 1];
    });
    
    return params;
  }
  
  async renderPage(route) {
    if (!this.contentContainer) {
      this.contentContainer = document.getElementById('main-content');
    }
    
    if (!this.contentContainer) {
      console.error('❌ #main-content no encontrado');
      return;
    }
    
    // Limpiar contenido anterior
    this.contentContainer.innerHTML = '';
    
    // Mostrar loading
    this.showLoading();
    
    try {
      // Ejecutar la función de renderizado de la página
      await route.component(this.contentContainer, route.params);
    } catch (error) {
      console.error('❌ Error renderizando página:', error);
      this.showError(error);
    } finally {
      this.hideLoading();
    }
  }
  
  updateActiveSidebarItem(path) {
    // Remover clase activa de todos los items
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('sidebar-item--active');
    });
    
    // Agregar clase activa al item correspondiente
    const activeItem = document.querySelector(`.sidebar-item[href="#${path}"]`);
    if (activeItem) {
      activeItem.classList.add('sidebar-item--active');
    }
  }
  
  updatePageTitle(title) {
    // Actualizar título del documento
    document.title = `${title} - Mi SaaS`;
    
    // Actualizar título en el topbar
    const topbarTitle = document.querySelector('.topbar-title');
    if (topbarTitle) {
      topbarTitle.textContent = title;
    }
  }
  
  navigateTo(path, checkAuth = true) {
    window.location.hash = path;
  }
  
  showLoading() {
    const spinner = document.createElement('div');
    spinner.id = 'page-loading';
    spinner.className = 'flex items-center justify-center p-8';
    spinner.innerHTML = `
      <div class="loading-spinner"></div>
    `;
    this.contentContainer.appendChild(spinner);
  }
  
  hideLoading() {
    const spinner = document.getElementById('page-loading');
    if (spinner) {
      spinner.remove();
    }
  }
  
  showError(error) {
    this.contentContainer.innerHTML = `
      <div class="p-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 class="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p class="text-red-600">${error.message}</p>
        </div>
      </div>
    `;
  }
  
  // Método para obtener parámetros de query (?key=value)
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    for (const [key, value] of params) {
      result[key] = value;
    }
    
    return result;
  }
}