import { el } from '../../mount.js';
import { searchData, searchConfig } from '../config/search-config.js';

let searchModal = null;
let searchDebounceTimer = null;
let currentResults = {};
let expandedCategories = new Set();

export function createSearchModal() {
  if (searchModal) {
    return searchModal;
  }
  
  // Overlay
  const overlay = el('div', {
    class: 'search-modal-overlay',
    id: 'search-modal-overlay',
    onclick: (e) => {
      if (e.target === overlay) {
        closeSearchModal();
      }
    }
  });
  
  // Container del modal
  const modalContainer = el('div', {
    class: 'search-modal-container'
  }, [
    // Input de búsqueda
    el('div', { class: 'search-modal-input-wrapper' }, [
      el('span', { class: 'search-modal-icon' }, '🔍'),
      el('input', {
        type: 'text',
        id: 'search-modal-input',
        class: 'search-modal-input',
        placeholder: 'Buscar en todo...',
        autocomplete: 'off',
        oninput: handleSearchInput
      }),
      el('kbd', { class: 'search-modal-kbd' }, 'Esc')
    ]),
    
    // Resultados
    el('div', {
      id: 'search-modal-results',
      class: 'search-modal-results'
    }, [
      el('div', { class: 'search-modal-empty' }, [
        el('p', { class: 'text-gray-500' }, 'Escribe al menos 2 caracteres para buscar')
      ])
    ])
  ]);
  
  overlay.appendChild(modalContainer);
  searchModal = overlay;
  
  return searchModal;
}

export function openSearchModal() {
  if (!searchModal) {
    createSearchModal();
  }
  
  // Agregar al DOM
  document.body.appendChild(searchModal);
  
  // Forzar reflow para animación
  searchModal.offsetHeight;
  
  // Activar animación
  searchModal.classList.add('search-modal-overlay--active');
  
  // Focus en input
  setTimeout(() => {
    const input = document.getElementById('search-modal-input');
    if (input) {
      input.focus();
    }
  }, 100);
  
  // Listeners
  document.addEventListener('keydown', handleKeyDown);
}

export function closeSearchModal() {
  if (!searchModal) return;
  
  searchModal.classList.remove('search-modal-overlay--active');
  
  setTimeout(() => {
    if (searchModal && searchModal.parentNode) {
      searchModal.parentNode.removeChild(searchModal);
    }
    
    // Limpiar
    const input = document.getElementById('search-modal-input');
    if (input) {
      input.value = '';
    }
    
    currentResults = {};
    expandedCategories.clear();
    
    document.removeEventListener('keydown', handleKeyDown);
  }, 200);
}

function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  // Limpiar timer anterior
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  if (query.length < searchConfig.minSearchLength) {
    renderEmptyState();
    return;
  }
  
  // Debounce
  searchDebounceTimer = setTimeout(async () => {
    await performSearch(query);
  }, searchConfig.searchDebounce);
}

async function performSearch(query) {
  const resultsContainer = document.getElementById('search-modal-results');
  if (!resultsContainer) return;
  
  // Mostrar loading
  resultsContainer.innerHTML = '';
  resultsContainer.appendChild(
    el('div', { class: 'search-modal-loading' }, [
      el('div', { class: 'loading-spinner' }),
      el('p', { class: 'text-gray-500 mt-4' }, 'Buscando...')
    ])
  );
  
  try {
    // Buscar (simular delay de API)
    await new Promise(resolve => setTimeout(resolve, 200));
    const results = await searchData(query);
    
    currentResults = results;
    renderResults(results);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    renderErrorState();
  }
}

function renderResults(results) {
  const resultsContainer = document.getElementById('search-modal-results');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '';
  
  const hasResults = Object.keys(results).length > 0;
  
  if (!hasResults) {
    resultsContainer.appendChild(
      el('div', { class: 'search-modal-empty' }, [
        el('p', { class: 'text-gray-500' }, 'No se encontraron resultados')
      ])
    );
    return;
  }
  
  // Renderizar cada categoría
  Object.entries(results).forEach(([categoryId, categoryResults]) => {
    const categorySection = renderCategorySection(categoryId, categoryResults);
    resultsContainer.appendChild(categorySection);
  });
}

function renderCategorySection(categoryId, categoryResults) {
  const { category, displayed, total, hasMore } = categoryResults;
  const isExpanded = expandedCategories.has(categoryId);
  const itemsToShow = isExpanded ? categoryResults.items : displayed;
  
  const section = el('div', { class: 'search-category-section' }, [
    // Header
    el('div', { class: 'search-category-header' }, [
      el('div', { class: 'search-category-title' }, [
        el('span', { class: 'search-category-icon' }, category.icon),
        el('span', { class: 'search-category-label' }, category.label),
        el('span', { class: 'search-category-count' }, `(${total})`)
      ]),
      hasMore && !isExpanded ? el('button', {
        class: 'search-category-show-all',
        onclick: () => toggleCategoryExpansion(categoryId)
      }, `Ver todos (${total}) →`) : null
    ].filter(Boolean)),
    
    // Items
    el('div', { class: 'search-category-items' },
      itemsToShow.map(item => renderResultItem(item, category))
    ),
    
    // Botón colapsar (si está expandido)
    isExpanded ? el('button', {
      class: 'search-category-collapse',
      onclick: () => toggleCategoryExpansion(categoryId)
    }, '← Mostrar menos') : null
  ].filter(Boolean));
  
  return section;
}

function renderResultItem(item, category) {
  const display = category.displayTemplate(item);
  
  return el('a', {
    href: `#${category.route(item)}`,
    class: 'search-result-item',
    onclick: (e) => {
      e.preventDefault();
      closeSearchModal();
      window.appRouter.navigateTo(category.route(item));
    }
  }, [
    el('div', { class: 'search-result-primary' }, display.primary),
    el('div', { class: 'search-result-secondary' }, [
      el('span', {}, display.secondary),
      display.tertiary ? el('span', { class: 'search-result-tertiary' }, display.tertiary) : null
    ].filter(Boolean))
  ]);
}

function toggleCategoryExpansion(categoryId) {
  if (expandedCategories.has(categoryId)) {
    expandedCategories.delete(categoryId);
  } else {
    expandedCategories.add(categoryId);
  }
  
  // Re-renderizar resultados
  renderResults(currentResults);
}

function renderEmptyState() {
  const resultsContainer = document.getElementById('search-modal-results');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '';
  resultsContainer.appendChild(
    el('div', { class: 'search-modal-empty' }, [
      el('p', { class: 'text-gray-500' }, 'Escribe al menos 2 caracteres para buscar')
    ])
  );
}

function renderErrorState() {
  const resultsContainer = document.getElementById('search-modal-results');
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = '';
  resultsContainer.appendChild(
    el('div', { class: 'search-modal-empty' }, [
      el('p', { class: 'text-red-600' }, 'Error al realizar la búsqueda')
    ])
  );
}

function handleKeyDown(e) {
  // Cerrar con Esc
  if (e.key === 'Escape') {
    closeSearchModal();
  }
}

// Exportar función para uso global
window.openSearchModal = openSearchModal;