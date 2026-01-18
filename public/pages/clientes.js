import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderClientes(container, params) {
  // 1. Estado local
  let clientes = [];
  let loading = true;
  let error = null;
  let searchTerm = '';
  let editingCliente = null;
  let showForm = false;
  let showFilters = false;
  let currentView = 'auto'; // 'auto', 'table', 'cards', 'details'

  // 2. Inicialización
  await init();

  // 3. Funciones auxiliares
  async function init() {
    await loadClientes();
    render();
  }

  async function loadClientes() {
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
        .from('clientes')
        .select('*')
        .eq('grupo_id', perfil.grupo_id)
        .order('nombre', { ascending: true });

      if (err) throw err;
      clientes = data || [];
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      error = err.message;
    } finally {
      loading = false;
      render();
    }
  }

  async function handleSubmit(formData) {
    try {
      const clienteData = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido') || null,
        email: formData.get('email'),
        telefono: formData.get('telefono') || null
      };

      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      if (editingCliente) {
        const { error: err } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', editingCliente.id)
          .eq('grupo_id', perfil.grupo_id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('clientes')
          .insert({
            ...clienteData,
            grupo_id: perfil.grupo_id
          });

        if (err) throw err;
      }

      showForm = false;
      editingCliente = null;
      await loadClientes();
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      alert('Error al guardar: ' + err.message);
    }
  }

  async function handleDelete(clienteId) {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      const { error: err } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (err) throw err;
      await loadClientes();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  function handleEdit(cliente) {
    editingCliente = cliente;
    showForm = true;
    render();
  }

  function handleSearch(term) {
    searchTerm = term.toLowerCase();
    render();
  }

  function getFilteredClientes() {
    if (!searchTerm) return clientes;
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(searchTerm) ||
      (c.apellido && c.apellido.toLowerCase().includes(searchTerm)) ||
      c.email.toLowerCase().includes(searchTerm)
    );
  }

  function getFullName(cliente) {
    return cliente.apellido 
      ? `${cliente.nombre} ${cliente.apellido}` 
      : cliente.nombre;
  }

  function render() {
    container.innerHTML = '';

    // Loading state
    if (loading) {
      mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [
        el('div', { class: 'text-gray-600' }, 'Cargando clientes...')
      ]);
      return;
    }

    // Error state
    if (error) {
      mount(container, 'div', { class: 'p-6' }, [
        el('div', {
          class: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'
        }, error)
      ]);
      return;
    }

    const filteredClientes = getFilteredClientes();

    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      // Header
      renderHeader(),

      // Formulario (condicional)
      showForm ? renderForm() : null,

      // Búsqueda y controles
      renderSearchAndControls(),

      // Filtros drawer (mobile)
      showFilters ? renderFiltersDrawer() : null,

      // Empty state
      filteredClientes.length === 0
        ? renderEmptyState()
        : el('div', {}, [
            // Vista Details (móvil < 640px)
            currentView === 'details' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'block sm:hidden' : 'block' },
                renderDetailsList(filteredClientes)
              ) : null,

            // Vista Cards (tablet 640-767px)
            currentView === 'cards' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden sm:block md:hidden' : 'block' },
                renderCardsGrid(filteredClientes)
              ) : null,

            // Vista Tabla (desktop ≥ 768px)
            currentView === 'table' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden md:block' : 'block' },
                renderTable(filteredClientes)
              ) : null
          ].filter(Boolean))
    ].filter(Boolean));
  }

  function renderHeader() {
    return el('div', { class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6' }, [
      el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Clientes'),
      el('button', {
        class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold w-full sm:w-auto',
        onclick: () => {
          editingCliente = null;
          showForm = true;
          render();
        }
      }, '+ Nuevo Cliente')
    ]);
  }

  function renderSearchAndControls() {
    return el('div', { class: 'mb-6 space-y-4' }, [
      // Barra de búsqueda
      el('div', { class: 'flex gap-2' }, [
        el('input', {
          type: 'text',
          placeholder: '🔍 Buscar por nombre o email...',
          class: 'flex-1 p-3 border rounded',
          value: searchTerm,
          oninput: (e) => handleSearch(e.target.value)
        }),
        // Botón filtros (móvil)
        el('button', {
          class: 'sm:hidden px-4 py-2 border rounded bg-white',
          onclick: () => {
            showFilters = !showFilters;
            render();
          }
        }, '⚙️')
      ]),

      // Controles de vista
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
      el('div', { class: 'text-6xl mb-4' }, '📭'),
      el('h3', { class: 'text-xl font-bold mb-2' }, 
        searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'
      ),
      el('p', { class: 'text-gray-600 mb-4' }, 
        searchTerm 
          ? 'Intenta con otro término de búsqueda'
          : 'Comienza agregando tu primer cliente'
      ),
      !searchTerm ? el('button', {
        class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
        onclick: () => {
          showForm = true;
          render();
        }
      }, '+ Crear Primer Cliente') : null
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border' }, [
      el('h2', { class: 'text-xl font-bold mb-4' },
        editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'
      ),
      el('form', {
        class: 'max-w-2xl',
        onsubmit: (e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.target));
        }
      }, [
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          // Nombre
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Nombre *'),
            el('input', {
              type: 'text',
              name: 'nombre',
              class: 'w-full p-2 border rounded',
              required: true,
              value: editingCliente?.nombre || ''
            })
          ]),
          // Apellido
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Apellido'),
            el('input', {
              type: 'text',
              name: 'apellido',
              class: 'w-full p-2 border rounded',
              value: editingCliente?.apellido || ''
            })
          ])
        ]),
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          // Email
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Email *'),
            el('input', {
              type: 'email',
              name: 'email',
              class: 'w-full p-2 border rounded',
              required: true,
              value: editingCliente?.email || ''
            })
          ]),
          // Teléfono
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Teléfono'),
            el('input', {
              type: 'tel',
              name: 'telefono',
              class: 'w-full p-2 border rounded',
              value: editingCliente?.telefono || ''
            })
          ])
        ]),
        // Botones
        el('div', { class: 'flex flex-col sm:flex-row gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingCliente ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded bg-white',
            onclick: () => {
              showForm = false;
              editingCliente = null;
              render();
            }
          }, 'Cancelar')
        ])
      ])
    ]);
  }

  function renderDetailsList(items) {
    return el('div', { class: 'space-y-2' }, items.map(cliente =>
      el('details', { class: 'bg-white border rounded-lg' }, [
        el('summary', {
          class: 'p-4 cursor-pointer hover:bg-gray-50 font-semibold flex justify-between items-center'
        }, [
          el('div', { class: 'flex-1' }, [
            el('div', { class: 'font-bold text-lg' }, getFullName(cliente)),
            el('div', { class: 'text-sm text-gray-600' }, `📧 ${cliente.email}`)
          ]),
          el('span', { class: 'text-gray-400' }, '▼')
        ]),
        el('div', { class: 'p-4 pt-0 border-t space-y-3' }, [
          cliente.telefono ? el('div', { class: 'flex items-center gap-2' }, [
            el('span', {}, '☎️'),
            el('span', {}, cliente.telefono)
          ]) : null,
          el('div', { class: 'text-xs text-gray-500' }, [
            'Creado: ',
            new Date(cliente.created_at).toLocaleDateString('es-AR')
          ]),
          // Acciones
          el('div', { class: 'flex gap-2 pt-2 border-t' }, [
            el('button', {
              class: 'flex-1 bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',
              onclick: () => handleEdit(cliente)
            }, 'Editar'),
            el('button', {
              class: 'flex-1 bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',
              onclick: () => handleDelete(cliente.id)
            }, 'Eliminar')
          ])
        ].filter(Boolean))
      ])
    ));
  }

  function renderCardsGrid(items) {
    return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, items.map(cliente =>
      el('div', { class: 'bg-white p-4 rounded-lg border' }, [
        el('div', { class: 'mb-3' }, [
          el('h3', { class: 'text-lg font-bold mb-1' }, getFullName(cliente)),
          el('p', { class: 'text-sm text-gray-600' }, `📧 ${cliente.email}`),
          cliente.telefono ? el('p', { class: 'text-sm text-gray-600 mt-1' }, 
            `☎️ ${cliente.telefono}`
          ) : null
        ].filter(Boolean)),
        el('div', { class: 'flex gap-2 pt-3 border-t' }, [
          el('button', {
            class: 'flex-1 bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleEdit(cliente)
          }, 'Editar'),
          el('button', {
            class: 'flex-1 bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleDelete(cliente.id)
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
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Nombre'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Email'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Teléfono'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Acciones')
              ])
            ]),
            el('tbody', { class: 'bg-white divide-y divide-gray-200' }, items.map(cliente =>
              el('tr', { class: 'hover:bg-gray-50' }, [
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('div', { class: 'font-semibold text-gray-900' }, getFullName(cliente))
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600' }, cliente.email),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600' }, cliente.telefono || '-'),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm' }, [
                  el('div', { class: 'flex gap-3' }, [
                    el('button', {
                      class: 'text-primary font-semibold hover:underline',
                      onclick: () => handleEdit(cliente)
                    }, 'Editar'),
                    el('button', {
                      class: 'text-red-600 font-semibold hover:underline',
                      onclick: () => handleDelete(cliente.id)
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