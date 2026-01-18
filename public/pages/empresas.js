import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderEmpresas(container, params) {
  // 1. Estado local
  let empresas = [];
  let loading = true;
  let error = null;
  let searchTerm = '';
  let editingEmpresa = null;
  let showForm = false;
  let showFilters = false;
  let currentView = 'auto';

  // 2. Inicialización
  await init();

  // 3. Funciones auxiliares
  async function init() {
    await loadEmpresas();
    render();
  }

  async function loadEmpresas() {
    try {
      loading = true;
      render();

      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      const { data, error: err } = await supabase
        .from('empresas')
        .select('*')
        .eq('grupo_id', perfil.grupo_id)
        .order('nombre', { ascending: true });

      if (err) throw err;
      empresas = data || [];
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      error = err.message;
    } finally {
      loading = false;
      render();
    }
  }

  async function handleSubmit(formData) {
    try {
      const empresaData = {
        nombre: formData.get('nombre'),
        razon_social: formData.get('razon_social'),
        cuit: formData.get('cuit')
      };

      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      if (editingEmpresa) {
        const { error: err } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', editingEmpresa.id)
          .eq('grupo_id', perfil.grupo_id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('empresas')
          .insert({
            ...empresaData,
            grupo_id: perfil.grupo_id
          });

        if (err) throw err;
      }

      showForm = false;
      editingEmpresa = null;
      await loadEmpresas();
    } catch (err) {
      console.error('Error al guardar empresa:', err);
      alert('Error al guardar: ' + err.message);
    }
  }

  async function handleDelete(empresaId) {
    if (!confirm('¿Estás seguro de eliminar esta empresa?')) return;

    try {
      const { error: err } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresaId);

      if (err) throw err;
      await loadEmpresas();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  function handleEdit(empresa) {
    editingEmpresa = empresa;
    showForm = true;
    render();
  }

  function handleSearch(term) {
    searchTerm = term.toLowerCase();
    render();
  }

  function getFilteredEmpresas() {
    if (!searchTerm) return empresas;
    return empresas.filter(e =>
      e.nombre.toLowerCase().includes(searchTerm) ||
      e.razon_social.toLowerCase().includes(searchTerm) ||
      e.cuit.includes(searchTerm)
    );
  }

  function formatCUIT(cuit) {
    // Si ya tiene guiones, retornar tal cual
    if (cuit.includes('-')) return cuit;
    // Formatear XX-XXXXXXXX-X
    if (cuit.length === 11) {
      return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
    }
    return cuit;
  }

  function maskCUIT(cuit) {
    const formatted = formatCUIT(cuit);
    // Mostrar solo últimos 4 dígitos
    return `***-****${formatted.slice(-5)}`;
  }

  function render() {
    container.innerHTML = '';

    if (loading) {
      mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [
        el('div', { class: 'text-gray-600' }, 'Cargando empresas...')
      ]);
      return;
    }

    if (error) {
      mount(container, 'div', { class: 'p-6' }, [
        el('div', {
          class: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'
        }, error)
      ]);
      return;
    }

    const filteredEmpresas = getFilteredEmpresas();

    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      renderHeader(),
      showForm ? renderForm() : null,
      renderSearchAndControls(),
      showFilters ? renderFiltersDrawer() : null,
      filteredEmpresas.length === 0
        ? renderEmptyState()
        : el('div', {}, [
            currentView === 'details' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'block sm:hidden' : 'block' },
                renderDetailsList(filteredEmpresas)
              ) : null,
            currentView === 'cards' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden sm:block md:hidden' : 'block' },
                renderCardsGrid(filteredEmpresas)
              ) : null,
            currentView === 'table' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden md:block' : 'block' },
                renderTable(filteredEmpresas)
              ) : null
          ].filter(Boolean))
    ].filter(Boolean));
  }

  function renderHeader() {
    return el('div', { class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6' }, [
      el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Empresas'),
      el('button', {
        class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold w-full sm:w-auto',
        onclick: () => {
          editingEmpresa = null;
          showForm = true;
          render();
        }
      }, '+ Nueva Empresa')
    ]);
  }

  function renderSearchAndControls() {
    return el('div', { class: 'mb-6 space-y-4' }, [
      el('div', { class: 'flex gap-2' }, [
        el('input', {
          type: 'text',
          placeholder: '🔍 Buscar por nombre o CUIT...',
          class: 'flex-1 p-3 border rounded',
          value: searchTerm,
          oninput: (e) => handleSearch(e.target.value)
        }),
        el('button', {
          class: 'sm:hidden px-4 py-2 border rounded bg-white',
          onclick: () => {
            showFilters = !showFilters;
            render();
          }
        }, '⚙️')
      ]),
      renderViewToggle()
    ]);
  }

  function renderViewToggle() {
    const buttonClass = (view) => {
      const isActive = currentView === view;
      return `px-4 py-2 rounded font-semibold ${
        isActive
          ? 'bg-primary text-white'
          : 'bg-white text-gray-700 border border-gray-300'
      }`;
    };

    return el('div', { class: 'flex gap-2 overflow-x-auto pb-2' }, [
      el('button', {
        class: buttonClass('auto'),
        onclick: () => {
          currentView = 'auto';
          render();
        }
      }, '📱 Auto'),
      el('button', {
        class: buttonClass('table'),
        onclick: () => {
          currentView = 'table';
          render();
        }
      }, '🗂️ Tabla'),
      el('button', {
        class: buttonClass('cards'),
        onclick: () => {
          currentView = 'cards';
          render();
        }
      }, '🎴 Cards'),
      el('button', {
        class: buttonClass('details'),
        onclick: () => {
          currentView = 'details';
          render();
        }
      }, '📋 Lista')
    ]);
  }

  function renderFiltersDrawer() {
    return el('div', {
      class: 'fixed inset-0 bg-gray-900 bg-opacity-50 z-50',
      onclick: (e) => {
        if (e.target === e.currentTarget) {
          showFilters = false;
          render();
        }
      }
    }, [
      el('div', { class: 'fixed right-0 top-0 h-full w-80 bg-white p-6 shadow-lg' }, [
        el('div', { class: 'flex justify-between items-center mb-6' }, [
          el('h2', { class: 'text-xl font-bold' }, 'Filtros'),
          el('button', {
            class: 'text-2xl',
            onclick: () => {
              showFilters = false;
              render();
            }
          }, '×')
        ]),
        el('p', { class: 'text-gray-600' }, 'Filtros adicionales próximamente...')
      ])
    ]);
  }

  function renderEmptyState() {
    return el('div', { class: 'text-center p-8 bg-gray-50 rounded-lg' }, [
      el('div', { class: 'text-6xl mb-4' }, '🏢'),
      el('h3', { class: 'text-xl font-bold mb-2' },
        searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'
      ),
      el('p', { class: 'text-gray-600 mb-4' },
        searchTerm
          ? 'Intenta con otro término de búsqueda'
          : 'Comienza agregando tu primera empresa'
      ),
      !searchTerm ? el('button', {
        class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
        onclick: () => {
          showForm = true;
          render();
        }
      }, '+ Crear Primera Empresa') : null
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border' }, [
      el('h2', { class: 'text-xl font-bold mb-4' },
        editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'
      ),
      el('form', {
        class: 'max-w-2xl',
        onsubmit: (e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.target));
        }
      }, [
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Nombre Comercial *'),
            el('input', {
              type: 'text',
              name: 'nombre',
              class: 'w-full p-2 border rounded',
              required: true,
              value: editingEmpresa?.nombre || ''
            })
          ]),
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'CUIT *'),
            el('input', {
              type: 'text',
              name: 'cuit',
              class: 'w-full p-2 border rounded',
              required: true,
              placeholder: '20-12345678-9 o 20123456789',
              maxlength: 13,
              value: editingEmpresa?.cuit || ''
            })
          ])
        ]),
        el('div', { class: 'mb-4' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Razón Social *'),
          el('input', {
            type: 'text',
            name: 'razon_social',
            class: 'w-full p-2 border rounded',
            required: true,
            value: editingEmpresa?.razon_social || ''
          })
        ]),
        el('div', { class: 'flex flex-col sm:flex-row gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingEmpresa ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded bg-white',
            onclick: () => {
              showForm = false;
              editingEmpresa = null;
              render();
            }
          }, 'Cancelar')
        ])
      ])
    ]);
  }

  function renderDetailsList(items) {
    return el('div', { class: 'space-y-2' }, items.map(empresa =>
      el('details', { class: 'bg-white border rounded-lg' }, [
        el('summary', {
          class: 'p-4 cursor-pointer hover:bg-gray-50 font-semibold flex justify-between items-center'
        }, [
          el('div', { class: 'flex-1' }, [
            el('div', { class: 'font-bold text-lg' }, empresa.nombre),
            el('div', { class: 'text-sm text-gray-600' }, `🏦 CUIT: ${maskCUIT(empresa.cuit)}`)
          ]),
          el('span', { class: 'text-gray-400' }, '▼')
        ]),
        el('div', { class: 'p-4 pt-0 border-t space-y-3' }, [
          el('div', {}, [
            el('div', { class: 'text-sm font-semibold text-gray-700 mb-1' }, 'Razón Social'),
            el('div', {}, empresa.razon_social)
          ]),
          el('div', {}, [
            el('div', { class: 'text-sm font-semibold text-gray-700 mb-1' }, 'CUIT Completo'),
            el('div', { class: 'font-mono' }, formatCUIT(empresa.cuit))
          ]),
          el('div', { class: 'text-xs text-gray-500' }, [
            'Creada: ',
            new Date(empresa.created_at).toLocaleDateString('es-AR')
          ]),
          el('div', { class: 'flex gap-2 pt-2 border-t' }, [
            el('button', {
              class: 'flex-1 bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',
              onclick: () => handleEdit(empresa)
            }, 'Editar'),
            el('button', {
              class: 'flex-1 bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',
              onclick: () => handleDelete(empresa.id)
            }, 'Eliminar')
          ])
        ])
      ])
    ));
  }

  function renderCardsGrid(items) {
    return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, items.map(empresa =>
      el('div', { class: 'bg-white p-4 rounded-lg border' }, [
        el('div', { class: 'mb-3' }, [
          el('h3', { class: 'text-lg font-bold mb-1' }, empresa.nombre),
          el('p', { class: 'text-sm text-gray-600 mb-1' }, empresa.razon_social),
          el('p', { class: 'text-sm text-gray-600 font-mono' }, `CUIT: ${formatCUIT(empresa.cuit)}`)
        ]),
        el('div', { class: 'flex gap-2 pt-3 border-t' }, [
          el('button', {
            class: 'flex-1 bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleEdit(empresa)
          }, 'Editar'),
          el('button', {
            class: 'flex-1 bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleDelete(empresa.id)
          }, 'Eliminar')
        ])
      ])
    ));
  }

  function renderTable(items) {
    return el('div', { class: 'overflow-x-auto -mx-4 sm:mx-0' }, [
      el('div', { class: 'inline-block min-w-full align-middle' }, [
        el('div', { class: 'overflow-hidden border rounded-lg' }, [
          el('table', { class: 'min-w-full divide-y divide-gray-200' }, [
            el('thead', { class: 'bg-gray-50' }, [
              el('tr', {}, [
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Nombre Comercial'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Razón Social'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'CUIT'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Acciones')
              ])
            ]),
            el('tbody', { class: 'bg-white divide-y divide-gray-200' }, items.map(empresa =>
              el('tr', { class: 'hover:bg-gray-50' }, [
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('div', { class: 'font-semibold text-gray-900' }, empresa.nombre)
                ]),
                el('td', { class: 'px-6 py-4 text-sm text-gray-600' }, empresa.razon_social),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono' }, formatCUIT(empresa.cuit)),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm' }, [
                  el('div', { class: 'flex gap-3' }, [
                    el('button', {
                      class: 'text-primary font-semibold hover:underline',
                      onclick: () => handleEdit(empresa)
                    }, 'Editar'),
                    el('button', {
                      class: 'text-red-600 font-semibold hover:underline',
                      onclick: () => handleDelete(empresa.id)
                    }, 'Eliminar')
                  ])
                ])
              ])
            ))
          ])
        ])
      ])
    ]);
  }
}