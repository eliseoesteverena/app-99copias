export const searchConfig = {
  // Configuración de categorías
  categories: [
    {
      id: 'ventas',
      label: 'Ventas',
      icon: '💰',
      color: '#10b981',
      searchFields: ['title', 'customer', 'amount', 'invoice'],
      displayTemplate: (item) => ({
        primary: item.title,
        secondary: item.amount,
        tertiary: item.date
      }),
      route: (item) => `/ventas/${item.id}`
    },
    {
      id: 'trabajos',
      label: 'Trabajos',
      icon: '🔧',
      color: '#3b82f6',
      searchFields: ['title', 'description', 'client', 'status'],
      displayTemplate: (item) => ({
        primary: item.title,
        secondary: item.status,
        tertiary: item.date
      }),
      route: (item) => `/trabajos/${item.id}`
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: '👥',
      color: '#8b5cf6',
      searchFields: ['name', 'email', 'phone', 'company'],
      displayTemplate: (item) => ({
        primary: item.name,
        secondary: item.email,
        tertiary: item.phone
      }),
      route: (item) => `/clientes/${item.id}`
    }
  ],
  
  maxResultsPerCategory: 3,
  searchDebounce: 300,
  minSearchLength: 2
};

// Mock data (será reemplazado por API real)
const mockSearchData = {
  ventas: [
    { id: 1, title: 'Venta #001 - Juan Pérez', customer: 'Juan Pérez', amount: '$1,250', date: '05/01/2025', invoice: 'INV-001' },
    { id: 2, title: 'Venta #002 - María García', customer: 'María García', amount: '$850', date: '04/01/2025', invoice: 'INV-002' },
    { id: 3, title: 'Venta #003 - Carlos López', customer: 'Carlos López', amount: '$2,100', date: '03/01/2025', invoice: 'INV-003' },
    { id: 4, title: 'Venta #004 - Ana Martínez', customer: 'Ana Martínez', amount: '$1,500', date: '02/01/2025', invoice: 'INV-004' },
    { id: 5, title: 'Venta #005 - Luis Rodríguez', customer: 'Luis Rodríguez', amount: '$3,200', date: '01/01/2025', invoice: 'INV-005' },
    { id: 6, title: 'Venta #006 - Elena Sánchez', customer: 'Elena Sánchez', amount: '$950', date: '31/12/2024', invoice: 'INV-006' },
    { id: 7, title: 'Venta #007 - Pedro Gómez', customer: 'Pedro Gómez', amount: '$1,800', date: '30/12/2024', invoice: 'INV-007' },
    { id: 8, title: 'Venta #008 - Laura Torres', customer: 'Laura Torres', amount: '$2,450', date: '29/12/2024', invoice: 'INV-008' },
    { id: 9, title: 'Venta #009 - Miguel Ángel', customer: 'Miguel Ángel', amount: '$1,100', date: '28/12/2024', invoice: 'INV-009' },
    { id: 10, title: 'Venta #010 - Carmen Díaz', customer: 'Carmen Díaz', amount: '$780', date: '27/12/2024', invoice: 'INV-010' },
    { id: 11, title: 'Venta #011 - Roberto Silva', customer: 'Roberto Silva', amount: '$4,200', date: '26/12/2024', invoice: 'INV-011' },
    { id: 12, title: 'Venta #012 - Patricia Ruiz', customer: 'Patricia Ruiz', amount: '$1,350', date: '25/12/2024', invoice: 'INV-012' },
    { id: 13, title: 'Venta #013 - Jorge Morales', customer: 'Jorge Morales', amount: '$2,900', date: '24/12/2024', invoice: 'INV-013' },
    { id: 14, title: 'Venta #014 - Isabel Vargas', customer: 'Isabel Vargas', amount: '$670', date: '23/12/2024', invoice: 'INV-014' },
    { id: 15, title: 'Venta #015 - Francisco Ortiz', customer: 'Francisco Ortiz', amount: '$1,920', date: '22/12/2024', invoice: 'INV-015' }
  ],
  trabajos: [
    { id: 1, title: 'Reparación PC - Oficina 3', description: 'Cambio de RAM y limpieza', client: 'Empresa XYZ', status: 'En progreso', date: '05/01/2025' },
    { id: 2, title: 'Instalación - Sucursal Norte', description: 'Instalación de red completa', client: 'Empresa ABC', status: 'Pendiente', date: '06/01/2025' },
    { id: 3, title: 'Mantenimiento - Servidor 1', description: 'Actualización de sistema', client: 'Empresa XYZ', status: 'Completado', date: '04/01/2025' },
    { id: 4, title: 'Configuración WiFi - Planta 2', description: 'Ampliar cobertura WiFi', client: 'Empresa DEF', status: 'En progreso', date: '05/01/2025' },
    { id: 5, title: 'Backup Sistema - Principal', description: 'Backup completo de datos', client: 'Empresa GHI', status: 'Pendiente', date: '07/01/2025' },
    { id: 6, title: 'Reparación Impresora - Sala 5', description: 'Cambio de toner y rodillos', client: 'Empresa JKL', status: 'Completado', date: '03/01/2025' },
    { id: 7, title: 'Migración Datos - Cloud', description: 'Migrar datos a servidor cloud', client: 'Empresa MNO', status: 'En progreso', date: '05/01/2025' },
    { id: 8, title: 'Instalación Software - 15 PCs', description: 'Instalación de suite office', client: 'Empresa PQR', status: 'Pendiente', date: '08/01/2025' }
  ],
  clientes: [
    { id: 1, name: 'Juan Pérez', email: 'juan@email.com', phone: '555-1234', company: 'Empresa A' },
    { id: 2, name: 'María García', email: 'maria@email.com', phone: '555-5678', company: 'Empresa B' },
    { id: 3, name: 'Carlos López', email: 'carlos@email.com', phone: '555-9012', company: 'Empresa C' },
    { id: 4, name: 'Ana Martínez', email: 'ana@email.com', phone: '555-3456', company: 'Empresa D' },
    { id: 5, name: 'Luis Rodríguez', email: 'luis@email.com', phone: '555-7890', company: 'Empresa E' },
    { id: 6, name: 'Elena Sánchez', email: 'elena@email.com', phone: '555-2345', company: 'Empresa F' },
    { id: 7, name: 'Pedro Gómez', email: 'pedro@email.com', phone: '555-6789', company: 'Empresa G' },
    { id: 8, name: 'Laura Torres', email: 'laura@email.com', phone: '555-0123', company: 'Empresa H' },
    { id: 9, name: 'Miguel Ángel', email: 'miguel@email.com', phone: '555-4567', company: 'Empresa I' },
    { id: 10, name: 'Carmen Díaz', email: 'carmen@email.com', phone: '555-8901', company: 'Empresa J' },
    { id: 11, name: 'Roberto Silva', email: 'roberto@email.com', phone: '555-2346', company: 'Empresa K' },
    { id: 12, name: 'Patricia Ruiz', email: 'patricia@email.com', phone: '555-6780', company: 'Empresa L' },
    { id: 13, name: 'Jorge Morales', email: 'jorge@email.com', phone: '555-0124', company: 'Empresa M' },
    { id: 14, name: 'Isabel Vargas', email: 'isabel@email.com', phone: '555-4568', company: 'Empresa N' },
    { id: 15, name: 'Francisco Ortiz', email: 'francisco@email.com', phone: '555-8902', company: 'Empresa O' },
    { id: 16, name: 'Sofía Herrera', email: 'sofia@email.com', phone: '555-2347', company: 'Empresa P' },
    { id: 17, name: 'Daniel Castro', email: 'daniel@email.com', phone: '555-6781', company: 'Empresa Q' },
    { id: 18, name: 'Lucía Mendoza', email: 'lucia@email.com', phone: '555-0125', company: 'Empresa R' },
    { id: 19, name: 'Andrés Ramírez', email: 'andres@email.com', phone: '555-4569', company: 'Empresa S' },
    { id: 20, name: 'Valentina Cruz', email: 'valentina@email.com', phone: '555-8903', company: 'Empresa T' },
    { id: 21, name: 'Javier Flores', email: 'javier@email.com', phone: '555-2348', company: 'Empresa U' },
    { id: 22, name: 'Gabriela Rojas', email: 'gabriela@email.com', phone: '555-6782', company: 'Empresa V' },
    { id: 23, name: 'Ricardo Navarro', email: 'ricardo@email.com', phone: '555-0126', company: 'Empresa W' }
  ]
};

// Función de búsqueda modular
export async function searchData(query, dataSource = null) {
  // Validación
  if (!query || query.length < searchConfig.minSearchLength) {
    return {};
  }

  const data = dataSource || mockSearchData;
  const lowerQuery = query.toLowerCase();
  const results = {};
  
  searchConfig.categories.forEach(category => {
    const categoryData = data[category.id] || [];
    
    const matches = categoryData.filter(item => {
      return category.searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(lowerQuery);
      });
    });
    
    if (matches.length > 0) {
      results[category.id] = {
        category: category,
        items: matches,
        total: matches.length,
        displayed: matches.slice(0, searchConfig.maxResultsPerCategory),
        hasMore: matches.length > searchConfig.maxResultsPerCategory
      };
    }
  });
  
  return results;
}

// Para uso futuro con API real:
// export async function searchDataFromAPI(query) {
//   const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
//   return await response.json();
// }