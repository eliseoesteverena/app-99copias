export const createDefaultConfig = (currentPage = '/') => {
  // Detectar si estamos en index.html (página de inicio)
  const isHomePage = currentPage === '/' || currentPage.includes('index.html');

  return {
    settings: {
      sidebarDefaultState: 'open',
      sidebarPersistence: true,
      sidebarWidth: {
        open: '300px',
        collapsed: '80px'
      },
      breakpoints: {
        mobile: 640,
        tablet: 768
      }
    },

    topBar: {
      height: '64px',
      
      scrollBehavior: {
        enabled: true,
        threshold: 100,
        compactMode: {
          showSearch: false,
          showUser: false,
          hamburgerStyle: 'circular',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)'
        }
      },

      title: {
        text: 'Dashboard',
        dynamic: true
      },

      search: {
        enabled: true,
        showContextSelector: isHomePage, // Solo en index.html
        autoContext: !isHomePage, // Automático en otras páginas
        contexts: {
          '/sales': { type: 'tickets', placeholder: 'Buscar tickets de venta...', icon: '🎫' },
          '/jobs': { type: 'jobs', placeholder: 'Buscar trabajos...', icon: '🔧' },
          '/clients': { type: 'clients', placeholder: 'Buscar clientes...', icon: '👥' },
          '/': { type: 'all', placeholder: 'Buscar en todo...', icon: '🔍' }
        },
        defaultContext: { type: 'all', placeholder: 'Buscar...', icon: '🔍' },
        onSearch: null // callback personalizado
      },

      notifications: {
        enabled: true,
        badge: 0, // Visual solamente por ahora
        onClick: null
      },

      user: {
        name: null, // Se carga desde AuthIntegration
        avatar: null,
        dropdown: [
          { 
            id: 'profile',
            label: 'Mi Perfil', 
            icon: '👤',
            href: '/profile.html' 
          },
          { 
            id: 'settings',
            label: 'Ajustes', 
            icon: '⚙️',
            href: '/settings.html' 
          },
          { 
            id: 'divider',
            type: 'divider' 
          },
          { 
            id: 'logout',
            label: 'Cerrar Sesión', 
            icon: '🚪',
            action: 'logout',
            variant: 'danger' 
          }
        ]
      }
    },

    sidebar: {
      header: null,
      
      items: [
        {
          id: 'dashboard',
          type: 'item',
          label: 'Dashboard',
          icon: '📊',
          href: '/dashboard.html',
          active: false,
          tooltip: 'Panel principal'
        },
        {
          id: 'sales',
          type: 'item',
          label: 'Ventas',
          icon: '💰',
          tooltip: 'Gestión de ventas',
          subItems: [
            { id: 'new-sale', label: 'Nueva Venta', href: '/sales/new.html', icon: '➕' },
            { id: 'sales-list', label: 'Lista de Ventas', href: '/sales.html', icon: '📋' },
            { id: 'invoices', label: 'Facturas', href: '/sales/invoices.html', icon: '🧾' }
          ]
        },
        {
          id: 'jobs',
          type: 'item',
          label: 'Trabajos',
          icon: '🔧',
          href: '/jobs.html',
          tooltip: 'Gestión de trabajos'
        },
        {
          id: 'clients',
          type: 'item',
          label: 'Clientes',
          icon: '👥',
          href: '/clients.html',
          tooltip: 'Base de clientes'
        },
        {
          id: 'reports',
          type: 'item',
          label: 'Reportes',
          icon: '📈',
          href: '/reports.html',
          tooltip: 'Informes y estadísticas'
        }
      ],

      footer: {
        enabled: true,
        hideWhenCollapsed: true, // ← OCULTAR en modo colapsado
        content: {
          version: 'v2.0.0',
          links: [
            { label: 'Ayuda', href: '/help.html', icon: '❓', target: '_blank' },
            { label: 'Docs', href: '/docs.html', icon: '📖', target: '_blank' }
          ]
        }
      }
    }
  };
};