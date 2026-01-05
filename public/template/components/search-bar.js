import { el } from '../../mount.js';

export function renderSearchBar(config, state) {
  const currentPath = window.location.pathname;
  const contextConfig = config.contexts[currentPath] || config.defaultContext;
  
  let currentContext = contextConfig.type;
  let contextSelectorOpen = false;
  
  const searchContainer = el('div.topbar-search', {});
  
  // Context selector (solo si showContextSelector es true)
  if (config.showContextSelector) {
    const contextButton = el('button.search-context-selector', {
      onclick: (e) => {
        e.stopPropagation();
        contextSelectorOpen = !contextSelectorOpen;
        updateContextDropdown();
      }
    }, [
      el('span', {}, contextConfig.icon),
      el('span', {}, '▼')
    ]);
    
    const contextDropdown = el('div.search-context-dropdown', {
      id: 'search-context-dropdown'
    }, Object.entries(config.contexts).map(([path, ctx]) =>
      el('div.search-context-option', {
        class: ctx.type === currentContext ? 'search-context-option--active' : '',
        onclick: () => {
          currentContext = ctx.type;
          contextSelectorOpen = false;
          updateContextDropdown();
          updateSearchPlaceholder(ctx);
        }
      }, [
        el('span', {}, ctx.icon),
        el('span', {}, ctx.placeholder)
      ])
    ));
    
    function updateContextDropdown() {
      contextDropdown.classList.toggle('search-context-dropdown--open', contextSelectorOpen);
    }
    
    function updateSearchPlaceholder(ctx) {
      searchInput.placeholder = ctx.placeholder;
      contextButton.querySelector('span:first-child').textContent = ctx.icon;
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (contextSelectorOpen) {
        contextSelectorOpen = false;
        updateContextDropdown();
      }
    });
    
    searchContainer.appendChild(contextButton);
    searchContainer.appendChild(contextDropdown);
  }
  
  // Search input
  const searchInput = el('input', {
    type: 'search',
    placeholder: contextConfig.placeholder,
    'aria-label': 'Buscar',
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        handleSearch(searchInput.value, currentContext);
      }
    }
  });
  
  searchContainer.appendChild(searchInput);
  
  function handleSearch(query, context) {
    if (!query.trim()) return;
    
    if (config.onSearch) {
      config.onSearch(query, context);
    } else {
      console.log(`Buscar "${query}" en contexto: ${context}`);
      // Aquí implementarías la lógica de búsqueda real
    }
  }
  
  return searchContainer;
}

