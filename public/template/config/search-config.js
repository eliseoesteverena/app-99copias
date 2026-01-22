import { supabase } from './config.js';

export const searchConfig = {
  // Configuración de categorías
  categories: [
    {
  id: 'trabajos',
  label: 'Trabajos',
  icon: '🔧',
  color: '#3b82f6',
  table: 'trabajos',
  // Agregamos los campos relacionales usando la sintaxis de punto
  searchFields: [
    'detalles',
    'clientes.nombre',
    'clientes.apellido',
    'empresas.nombre'
  ],
  selectFields: `id,detalles,presupuesto,estado,prioridad,fecha_entrega,cliente:clientes(nombre, apellido),empresa:empresas(nombre)`,
  displayTemplate: (item) => ({
    primary: item.detalles?.substring(0, 60) + '...' || 'Sin detalles',
    secondary: `${item.estado} - ${item.prioridad}`,
    tertiary: item.cliente ? `${item.cliente.nombre} ${item.cliente.apellido || ''}` : 'Sin cliente'
  }),
  route: (item) => `/trabajos/${item.id}`
},
    {
      id: 'clientes',
      label: 'Clientes',
      icon: '👥',
      color: '#8b5cf6',
      table: 'clientes',
      searchFields: ['nombre', 'apellido', 'email', 'telefono'],
      selectFields: `
        id,
        nombre,
        apellido,
        email,
        telefono
      `,
      displayTemplate: (item) => ({
        primary: `${item.nombre} ${item.apellido || ''}`,
        secondary: item.email || 'Sin email',
        tertiary: item.telefono || 'Sin teléfono'
      }),
      route: (item) => `/clientes/${item.id}`
    },
    {
      id: 'empresas',
      label: 'Empresas',
      icon: '🏢',
      color: '#10b981',
      table: 'empresas',
      searchFields: ['nombre', 'razon_social', 'cuit'],
      selectFields: `
        id,
        nombre,
        razon_social,
        cuit
      `,
      displayTemplate: (item) => ({
        primary: item.nombre || 'Sin nombre',
        secondary: item.razon_social || 'Sin razón social',
        tertiary: item.cuit || 'Sin CUIT'
      }),
      route: (item) => `/empresas/${item.id}`
    }
  ],
  maxResultsPerCategory: 5,
  searchDebounce: 300,
  minSearchLength: 2
};

/**
 * Función de búsqueda en Supabase
 * @param {string} query - Término de búsqueda
 * @param {string|null} categoryId - ID de categoría específica (opcional)
 * @returns {Promise<Object>} Resultados agrupados por categoría
 */
export async function searchData(query, categoryId = null) {
  // Validación
  if (!query || query.length < searchConfig.minSearchLength) {
    return {};
  }

  const lowerQuery = query.toLowerCase();
  const results = {};

  // Filtrar categorías si se especifica una
  const categoriesToSearch = categoryId
    ? searchConfig.categories.filter(c => c.id === categoryId)
    : searchConfig.categories;

  // Ejecutar búsquedas en paralelo
  const searchPromises = categoriesToSearch.map(async (category) => {
    try {
      // Construir query base
      let queryBuilder = supabase
        .from(category.table)
        .select(category.selectFields);

      // Aplicar filtros de búsqueda con OR
      const searchConditions = category.searchFields.map(field => 
        `${field}.ilike.%${query}%`
      ).join(',');

      queryBuilder = queryBuilder.or(searchConditions);

      // Ejecutar query
      const { data, error, count } = await queryBuilder
        .limit(20); // Límite más alto para después filtrar

      if (error) {
        console.error(`Error buscando en ${category.id}:`, error);
        return null;
      }

      // Filtrar y limitar resultados
      if (data && data.length > 0) {
        return {
          categoryId: category.id,
          category: category,
          items: data,
          total: data.length,
          displayed: data.slice(0, searchConfig.maxResultsPerCategory),
          hasMore: data.length > searchConfig.maxResultsPerCategory
        };
      }

      return null;
    } catch (error) {
      console.error(`Error en búsqueda de ${category.id}:`, error);
      return null;
    }
  });

  // Esperar todas las búsquedas
  const searchResults = await Promise.all(searchPromises);

  // Construir objeto de resultados
  searchResults.forEach(result => {
    if (result) {
      results[result.categoryId] = result;
    }
  });

  return results;
}

/**
 * Búsqueda en una categoría específica con filtros adicionales
 * @param {string} categoryId - ID de la categoría
 * @param {string} query - Término de búsqueda
 * @param {Object} filters - Filtros adicionales
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>} Lista de resultados
 */
export async function searchInCategory(categoryId, query, filters = {}, limit = 50) {
  const category = searchConfig.categories.find(c => c.id === categoryId);
  
  if (!category) {
    console.error(`Categoría ${categoryId} no encontrada`);
    return [];
  }

  try {
    let queryBuilder = supabase
      .from(category.table)
      .select(category.selectFields);

    // Búsqueda por texto si hay query
    if (query && query.length >= searchConfig.minSearchLength) {
      const searchConditions = category.searchFields.map(field => 
        `${field}.ilike.%${query}%`
      ).join(',');
      queryBuilder = queryBuilder.or(searchConditions);
    }

    // Aplicar filtros adicionales
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          queryBuilder = queryBuilder.in(key, value);
        } else {
          queryBuilder = queryBuilder.eq(key, value);
        }
      }
    });

    // Ejecutar query
    const { data, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error(`Error en búsqueda de ${categoryId}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error en searchInCategory:`, error);
    return [];
  }
}

/**
 * Obtener detalles de un item específico
 * @param {string} categoryId - ID de la categoría
 * @param {string} itemId - ID del item
 * @returns {Promise<Object|null>} Item encontrado o null
 */
export async function getItemDetails(categoryId, itemId) {
  const category = searchConfig.categories.find(c => c.id === categoryId);
  
  if (!category) {
    console.error(`Categoría ${categoryId} no encontrada`);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(category.table)
      .select(category.selectFields)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error(`Error obteniendo detalles:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error en getItemDetails:`, error);
    return null;
  }
}

/**
 * Búsqueda reciente (últimos registros creados)
 * @param {string} categoryId - ID de la categoría
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>} Lista de registros recientes
 */
export async function getRecentItems(categoryId, limit = 5) {
  const category = searchConfig.categories.find(c => c.id === categoryId);
  
  if (!category) {
    console.error(`Categoría ${categoryId} no encontrada`);
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(category.table)
      .select(category.selectFields)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Error obteniendo items recientes:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Error en getRecentItems:`, error);
    return [];
  }
}

/**
 * Estadísticas de búsqueda (útil para analytics)
 * @param {string} query - Término de búsqueda
 * @returns {Promise<Object>} Contadores por categoría
 */
export async function getSearchStats(query) {
  if (!query || query.length < searchConfig.minSearchLength) {
    return {};
  }

  const stats = {};

  const statsPromises = searchConfig.categories.map(async (category) => {
    try {
      const searchConditions = category.searchFields.map(field => 
        `${field}.ilike.%${query}%`
      ).join(',');

      const { count, error } = await supabase
        .from(category.table)
        .select('*', { count: 'exact', head: true })
        .or(searchConditions);

      if (!error) {
        return { categoryId: category.id, count: count || 0 };
      }
    } catch (error) {
      console.error(`Error en stats de ${category.id}:`, error);
    }
    return { categoryId: category.id, count: 0 };
  });

  const results = await Promise.all(statsPromises);
  
  results.forEach(result => {
    stats[result.categoryId] = result.count;
  });

  return stats;
}