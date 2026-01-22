
import { supabase } from './config.js';

export const searchConfig = {
  categories: [
    {
      id: 'trabajos',
      label: 'Trabajos',
      icon: '🔧',
      color: '#3b82f6',
      table: 'trabajos',
      searchFields: [
        'detalles',
        'clientes.nombre',
        'clientes.apellido',
        'empresas.nombre'
      ],
      selectFields: `
        id,
        detalles,
        presupuesto,
        estado,
        prioridad,
        fecha_entrega,
        cliente:clientes(nombre, apellido),
        empresa:empresas(nombre)
      `,
      displayTemplate: (item) => ({
        primary: item.detalles
          ? item.detalles.substring(0, 60) + '...'
          : 'Sin detalles',
        secondary: `${item.estado} - ${item.prioridad}`,
        tertiary: item.cliente
          ? `${item.cliente.nombre} ${item.cliente.apellido || ''}`
          : 'Sin cliente'
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

function buildSearchConditions(searchFields, query) {
  return searchFields.map(field => {
    if (field.includes('.')) {
      const [relation, column] = field.split('.');
      return `${relation}(${column}).ilike.%${query}%`;
    }
    return `${field}.ilike.%${query}%`;
  }).join(',');
}

export async function searchData(query, categoryId = null) {
  if (!query || query.length < searchConfig.minSearchLength) {
    return {};
  }

  const results = {};
  const categoriesToSearch = categoryId
    ? searchConfig.categories.filter(c => c.id === categoryId)
    : searchConfig.categories;

  const searchPromises = categoriesToSearch.map(async (category) => {
    try {
      let queryBuilder = supabase
        .from(category.table)
        .select(category.selectFields);

      const searchConditions = buildSearchConditions(
        category.searchFields,
        query
      );

      queryBuilder = queryBuilder.or(searchConditions);

      const { data, error } = await queryBuilder.limit(20);

      if (error) {
        console.error(`Error buscando en ${category.id}:`, error);
        return null;
      }

      if (data && data.length > 0) {
        return {
          categoryId: category.id,
          category,
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

  const searchResults = await Promise.all(searchPromises);

  searchResults.forEach(result => {
    if (result) {
      results[result.categoryId] = result;
    }
  });

  return results;
}

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

    if (query && query.length >= searchConfig.minSearchLength) {
      const searchConditions = buildSearchConditions(
        category.searchFields,
        query
      );
      queryBuilder = queryBuilder.or(searchConditions);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          queryBuilder = queryBuilder.in(key, value);
        } else {
          queryBuilder = queryBuilder.eq(key, value);
        }
      }
    });

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

export async function getSearchStats(query) {
  if (!query || query.length < searchConfig.minSearchLength) {
    return {};
  }

  const stats = {};

  const statsPromises = searchConfig.categories.map(async (category) => {
    try {
      const searchConditions = buildSearchConditions(
        category.searchFields,
        query
      );

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
