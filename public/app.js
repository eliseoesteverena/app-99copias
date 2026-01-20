import { supabase } from './config.js';
import { TemplateManager } from './template/core/template-manager.js';
import { AuthIntegration } from './template/core/auth-integration.js';
import { Router } from './template/core/router.js';
import { createDefaultConfig } from './template/config/default-config.js';

// Importar páginas
import { renderDashboard } from './pages/dashboard.js';
/*import { renderVentas } from './pages/ventas.js';
import { renderTrabajos } from './pages/trabajos.js';
import { renderClientes } from './pages/clientes.js';
import { renderReportes } from './pages/reportes.js';*/
import { renderLogin } from './pages/login.js';
import { renderClientes } from './pages/clientes.js';
import { renderEmpresas } from './pages/empresas.js';
import { renderTrabajos } from './pages/trabajos.js';
import { renderEquipo } from './pages/equipo.js';
import { renderConfiguracionGrupo } from './pages/configuracion-grupo.js';


// Definición de rutas
const routes = [
  {
    path: '/login',
    component: renderLogin,
    title: 'Iniciar Sesión',
    requiresAuth: false
  },
  {
    path: '/',
    component: renderDashboard,
    title: 'Dashboard',
    requiresAuth: true
  },
  {
    path: '/dashboard',
    component: renderDashboard,
    title: 'Dashboard',
    requiresAuth: true
  },
  {
  path: '/clientes',
  component: renderClientes,
  title: 'Clientes',
  requiresAuth: true
},
{
  path: '/empresas',
  component: renderEmpresas,
  title: 'Empresas',
  requiresAuth: true
},
{
  path: '/trabajos',
  component: renderTrabajos,
  title: 'Trabajos',
  requiresAuth: true
},
{
  path: '/equipo',
  component: renderEquipo,
  title: 'Mi Equipo',
  requiresAuth: true
},
{
  path: '/configuracion-grupo',
  component: renderConfiguracionGrupo,
  title: 'Configuración del Grupo',
  requiresAuth: true,
  permissions: ['admin']
}

];

// Variables globales
let template = null;
let router = null;

// Inicialización de la app
(async function initApp() {
  console.log('🚀 Inicializando aplicación SPA...');

  // Obtener contenedor principal
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('❌ #app no encontrado');
    return;
  }

  // Inicializar autenticación
  const auth = new AuthIntegration(supabase);

  // Verificar si hay sesión
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    console.log('✅ Sesión activa detectada');
    await auth.init();
  } else {
    console.log('ℹ️ No hay sesión activa');
  }

  // Determinar ruta inicial
  const currentHash = window.location.hash.slice(1) || '/';
  
  // Redirigir según estado de sesión
  if (!session && currentHash !== '/login') {
    console.log('🔄 Sin sesión, redirigiendo a /login');
    window.location.hash = '/login';
  }
  
  if (session && currentHash === '/login') {
    console.log('🔄 Con sesión en login, redirigiendo a /dashboard');
    window.location.hash = '/dashboard';
  }

  // PASO CRÍTICO: Inicializar template O crear contenedor básico
  if (session) {
    // CON SESIÓN: Renderizar template completo
    const config = createDefaultConfig();
    
    // Actualizar hrefs del sidebar para usar hash
    config.sidebar.items = config.sidebar.items.map(item => ({
      ...item,
      href: item.href ? `#${item.href.replace('.html', '')}` : '#',
      subItems: item.subItems?.map(sub => ({
        ...sub,
        href: sub.href ? `#${sub.href.replace('.html', '')}` : '#'
      }))
    }));

    template = new TemplateManager(config, auth);
    await template.init(appContainer);
    
    console.log('✅ Template inicializado');
  } else {
    // SIN SESIÓN: Crear solo el contenedor #main-content
    appContainer.innerHTML = '';
    
    const mainContent = document.createElement('main');
    mainContent.id = 'main-content';
    mainContent.style.minHeight = '100vh';
    mainContent.style.background = '#f9fafb';
    
    appContainer.appendChild(mainContent);
    
    console.log('✅ Contenedor básico creado para login');
  }

  // Inicializar router DESPUÉS de crear el contenedor
  router = new Router(routes, auth, template);
  
  // Exponer router globalmente
  window.appRouter = router;

  // Exponer templateManager globalmente 
  window.TemplateManager = TemplateManager;

/*
  // Escuchar cambios de autenticación
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    if (event === 'SIGNED_IN') {
      console.log('✅ Usuario autenticado, recargando...');
      window.location.reload();
    } else if (event === 'SIGNED_OUT') {
      console.log('🚪 Usuario cerró sesión, recargando...');
      window.location.hash = '/login';
      window.location.reload();
    }
  });
*/

supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state changed:', event);
  
  // Solo recargar en eventos de login/logout reales
  if (event === 'SIGNED_IN' && !template) {
    // Solo si no hay template inicializado (login real)
    console.log('✅ Usuario autenticado, recargando...');
    window.location.reload();
  } else if (event === 'SIGNED_OUT') {
    console.log('🚪 Usuario cerró sesión, redirigiendo...');
    window.location.hash = '/login';
    window.location.reload();
  } else if (event === 'TOKEN_REFRESHED') {
    // Ignorar refrescos de token
    console.log('🔄 Token refrescado');
  }
});

  console.log('✅ Aplicación inicializada');
})();