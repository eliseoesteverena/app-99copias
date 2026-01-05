import { el, mount } from '../mount.js';

export async function renderDashboard(container) {
  console.log('📊 Renderizando dashboard...');
  
  // Puedes hacer fetch de datos aquí
  // const data = await fetchDashboardData();
  
  mount(container, 'div', { class: 'container p-6' }, [
    el('h1', { class: 'text-3xl font-bold mb-6' }, 'Dashboard'),
    
    // Cards de resumen
    el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-8' }, [
      createStatCard('💰', 'Ventas del Mes', '$45,231', '+12%'),
      createStatCard('👥', 'Clientes Activos', '1,234', '+5%'),
      createStatCard('🔧', 'Trabajos Pendientes', '18', '-3%')
    ]),
    
    // Botones de acción
    el('div', { class: 'flex gap-4' }, [
      el('button', {
        class: 'bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark',
        onclick: () => {
          window.appRouter.navigateTo('/ventas/nueva');
        }
      }, '+ Nueva Venta'),
      
      el('button', {
        class: 'border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50',
        onclick: () => {
          window.appRouter.navigateTo('/clientes');
        }
      }, 'Ver Clientes')
    ])
  ]);
}

function createStatCard(icon, label, value, change) {
  const isPositive = change.startsWith('+');
  
  return el('div', { class: 'bg-white p-6 rounded-lg border' }, [
    el('div', { class: 'flex items-center justify-between mb-4' }, [
      el('span', { style: { fontSize: '2rem' } }, icon),
      el('span', {
        class: isPositive ? 'text-green-600' : 'text-red-600',
        style: { fontSize: '0.875rem', fontWeight: '500' }
      }, change)
    ]),
    el('p', { class: 'text-gray-600 text-sm mb-1' }, label),
    el('p', { class: 'text-2xl font-bold text-gray-900' }, value)
  ]);
}