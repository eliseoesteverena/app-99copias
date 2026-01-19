// clientes.js
import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderClientes(container, params) {
  // 1. Estado local
  let clientes = [];
  let loading = true;
  let error = null;
  let editingCliente = null;
  let showForm = false;
  let currentView = 'cards'; // 'cards' o 'details'

  // 2. Inicialización
  await init();

  // 3. Funciones auxiliares
  async function init() {
    // Si hay ID en params, abrir modal de edición
    if (params?.id) {
      await loadClientes();
      const cliente = clientes.find(c => c.id === params.id);
      if (cliente) {
        editingCliente = cliente;
        showForm = true;
      }
    } else {
      await loadClientes();
    }
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

      closeModal();
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
    // Actualizar URL sin recargar
    window.history.pushState({}, '', `#/clientes/${cliente.id}`);
    render();
  }

  function closeModal() {
    showForm = false;
    editingCliente = null;
    // Volver a URL base
    window.history.pushState({}, '', '#/clientes');
    render();
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

    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      // Header
      renderHeader(),

      // Búsqueda global hint
      renderSearchHint(),

      // Controles de vista
      renderViewToggle(),

      // Empty state
      clientes.length === 0
        ? renderEmptyState()
        : el('div', {}, [
            // Vista Details (móvil)
            currentView === 'details'
              ? renderDetailsList(clientes)
              : null,

            // Vista Cards (default)
            currentView === 'cards'
              ? renderCardsGrid(clientes)
              : null
          ].filter(Boolean))
    ].filter(Boolean));

    // Modal (fuera del flujo)
    if (showForm) {
      mount(container, 'div', {}, [renderModal()]);
    }
  }

  function renderHeader() {
    return el('div', { 
      class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6' 
    }, [
      el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Clientes'),
      el('button', {
        class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold',
        style: { width: 'fit-content' },
        onclick: () => {
          editingCliente = null;
          showForm = true;
          render();
        }
      }, '+ Nuevo Cliente')
    ]);
  }

  function renderSearchHint() {
    return el('div', { 
      class: 'mb-4 p-3 bg-gray-50 border rounded text-sm text-gray-600 text-center' 
    }, '💡 Presiona Ctrl+K para buscar');
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

    return el('div', { class: 'flex gap-2 mb-6' }, [
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

  function renderEmptyState() {
    return el('div', { class: 'text-center p-8 bg-gray-50 rounded-lg' }, [
      el('div', { class: 'text-6xl mb-4' }, '📭'),
      el('h3', { class: 'text-xl font-bold mb-2' }, 'No hay clientes registrados'),
      el('p', { class: 'text-gray-600 mb-4' }, 'Comienza agregando tu primer cliente'),
      el('button', {
        class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
        style: { width: 'fit-content' },
        onclick: () => {
          showForm = true;
          render();
        }
      }, '+ Crear Primer Cliente')
    ]);
  }

  function renderModal() {
    return el('div', {
      class: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: '9999' 
      },
      onclick: (e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }
    }, [
      el('div', { 
        class: 'bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto',
        style: {
          zIndex: '10000',
          position: 'relative'
        },
        onclick: (e) => e.stopPropagation()
      }, [
        // Header del modal
        el('div', { class: 'flex justify-between items-center p-6 border-b' }, [
          el('h2', { class: 'text-xl font-bold' },
            editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'
          ),
          el('button', {
            class: 'text-2xl text-gray-500 hover:text-gray-700',
            onclick: closeModal
          }, '×')
        ]),

        // Formulario
        el('form', {
          class: 'p-6',
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

          el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6' }, [
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
          el('div', { class: 'flex gap-3 justify-end' }, [
            el('button', {
              type: 'button',
              class: 'px-6 py-2 border rounded bg-white',
              onclick: closeModal
            }, 'Cancelar'),
            el('button', {
              type: 'submit',
              class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
            }, editingCliente ? 'Actualizar' : 'Guardar')
          ])
        ])
      ])
    ]);
  }

  function renderDetailsList(items) {
    return el('div', { class: 'space-y-3' }, items.map(cliente =>
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
    return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' }, 
      items.map(cliente =>
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
      )
    );
  }
}