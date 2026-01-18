import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderTrabajos(container, params) {
  // 1. Estado local
  let trabajos = [];
  let clientes = [];
  let empresas = [];
  let loading = true;
  let error = null;
  let showForm = false;
  let editingTrabajo = null;
  let filterEstado = '';
  let filterPrioridad = '';
  let showFilters = false;
  let currentView = 'auto';

  // Estados y prioridades (CORREGIDOS según schema SQL)
  const ESTADOS = ['Presupuesto', 'Aprobado', 'En Curso', 'Pausado', 'Completado', 'Cancelado', 'Archivado'];
  const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

  // 2. Inicialización
  await init();

  // 3. Funciones auxiliares
  async function init() {
    await Promise.all([loadTrabajos(), loadClientes(), loadEmpresas()]);
    render();
  }

  async function loadTrabajos() {
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
        .from('trabajos')
        .select(`
          *,
          cliente:clientes(id, nombre, apellido),
          empresa:empresas(id, nombre),
          creador:perfiles!trabajos_created_user_id_fkey(id, name)
        `)
        .eq('grupo_id', perfil.grupo_id)
        .order('fecha_entrega', { ascending: true, nullsFirst: false });

      if (err) throw err;
      trabajos = data || [];
    } catch (err) {
      console.error('Error al cargar trabajos:', err);
      error = err.message;
    } finally {
      loading = false;
      render();
    }
  }

  async function loadClientes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      const { data, error: err } = await supabase
        .from('clientes')
        .select('id, nombre, apellido')
        .eq('grupo_id', perfil.grupo_id)
        .order('nombre');

      if (err) throw err;
      clientes = data || [];
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }

  async function loadEmpresas() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      const { data, error: err } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('grupo_id', perfil.grupo_id)
        .order('nombre');

      if (err) throw err;
      empresas = data || [];
    } catch (err) {
      console.error('Error al cargar empresas:', err);
    }
  }

  async function handleSubmit(formData) {
    try {
      const trabajoData = {
        cliente_id: formData.get('cliente_id'),
        empresa_id: formData.get('empresa_id') || null,
        detalles: formData.get('detalles'),
        presupuesto: parseFloat(formData.get('presupuesto')) || 0,
        monto_pagado: parseFloat(formData.get('monto_pagado')) || 0,
        estado: formData.get('estado'),
        prioridad: formData.get('prioridad'),
        fecha_entrega: formData.get('fecha_entrega') || null
      };

      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();

      if (editingTrabajo) {
        const { error: err } = await supabase
          .from('trabajos')
          .update(trabajoData)
          .eq('id', editingTrabajo.id)
          .eq('grupo_id', perfil.grupo_id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('trabajos')
          .insert({
            ...trabajoData,
            grupo_id: perfil.grupo_id,
            created_user_id: user.id
          });

        if (err) throw err;
      }

      showForm = false;
      editingTrabajo = null;
      await loadTrabajos();
    } catch (err) {
      console.error('Error al guardar trabajo:', err);
      alert('Error al guardar: ' + err.message);
    }
  }

  async function handleDelete(trabajoId) {
    if (!confirm('¿Estás seguro de eliminar este trabajo?')) return;

    try {
      const { error: err } = await supabase
        .from('trabajos')
        .delete()
        .eq('id', trabajoId);

      if (err) throw err;
      await loadTrabajos();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  function handleEdit(trabajo) {
    editingTrabajo = trabajo;
    showForm = true;
    render();
  }

  function getFilteredTrabajos() {
    return trabajos.filter(t => {
      const matchEstado = !filterEstado || t.estado === filterEstado;
      const matchPrioridad = !filterPrioridad || t.prioridad === filterPrioridad;
      return matchEstado && matchPrioridad;
    });
  }

  function getEstadoBadgeClass(estado) {
    const classes = {
      'Presupuesto': 'bg-gray-100 text-gray-800',
      'Aprobado': 'bg-blue-100 text-blue-800',
      'En Curso': 'bg-yellow-100 text-yellow-800',
      'Pausado': 'bg-orange-100 text-orange-800',
      'Completado': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800',
      'Archivado': 'bg-gray-300 text-gray-700'
    };
    return classes[estado] || 'bg-gray-100 text-gray-800';
  }

  function getPrioridadBadgeClass(prioridad) {
    const classes = {
      'Baja': 'bg-green-50 text-green-700',
      'Media': 'bg-blue-50 text-blue-700',
      'Alta': 'bg-orange-50 text-orange-700',
      'Urgente': 'bg-red-50 text-red-700'
    };
    return classes[prioridad] || 'bg-gray-50 text-gray-700';
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
  }

  function getClienteName(trabajo) {
    if (!trabajo.cliente) return 'Sin cliente';
    const { nombre, apellido } = trabajo.cliente;
    return apellido ? `${nombre} ${apellido}` : nombre;
  }

  function render() {
    container.innerHTML = '';

    if (loading) {
      mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [
        el('div', { class: 'text-gray-600' }, 'Cargando trabajos...')
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

    const filteredTrabajos = getFilteredTrabajos();

    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      renderHeader(),
      showForm ? renderForm() : null,
      renderSearchAndControls(),
      showFilters ? renderFiltersDrawer() : null,
      filteredTrabajos.length === 0
        ? renderEmptyState()
        : el('div', {}, [
            currentView === 'details' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'block sm:hidden' : 'block' },
                renderDetailsList(filteredTrabajos)
              ) : null,
            currentView === 'cards' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden sm:block md:hidden' : 'block' },
                renderCardsGrid(filteredTrabajos)
              ) : null,
            currentView === 'table' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden md:block' : 'block' },
                renderTable(filteredTrabajos)
              ) : null
          ].filter(Boolean))
    ].filter(Boolean));
  }

  function renderHeader() {
    return el('div', { class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6' }, [
      el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Trabajos'),
      el('button', {
        class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold w-full sm:w-auto',
        onclick: () => {
          editingTrabajo = null;
          showForm = true;
          render();
        }
      }, '+ Nuevo Trabajo')
    ]);
  }

  function renderSearchAndControls() {
    return el('div', { class: 'mb-6 space-y-4' }, [
      el('div', { class: 'flex gap-2' }, [
        el('button', {
          class: 'flex-1 sm:flex-none px-4 py-2 border rounded bg-white font-semibold',
          onclick: () => {
            showFilters = !showFilters;
            render();
          }
        }, `⚙️ Filtros ${(filterEstado || filterPrioridad) ? '●' : ''}`),
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
      el('div', { class: 'fixed right-0 top-0 h-full w-80 bg-white p-6 shadow-lg overflow-y-auto' }, [
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
        // Filtro Estado
        el('div', { class: 'mb-6' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Estado'),
          el('select', {
            class: 'w-full p-2 border rounded',
            value: filterEstado,
            onchange: (e) => {
              filterEstado = e.target.value;
              render();
            }
          }, [
            el('option', { value: '' }, 'Todos'),
            ...ESTADOS.map(estado =>
              el('option', { value: estado }, estado)
            )
          ])
        ]),
        // Filtro Prioridad
        el('div', { class: 'mb-6' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Prioridad'),
          el('select', {
            class: 'w-full p-2 border rounded',
            value: filterPrioridad,
            onchange: (e) => {
              filterPrioridad = e.target.value;
              render();
            }
          }, [
            el('option', { value: '' }, 'Todas'),
            ...PRIORIDADES.map(prioridad =>
              el('option', { value: prioridad }, prioridad)
            )
          ])
        ]),
        // Limpiar filtros
        el('button', {
          class: 'w-full px-4 py-2 border rounded bg-white',
          onclick: () => {
            filterEstado = '';
            filterPrioridad = '';
            render();
          }
        }, 'Limpiar Filtros')
      ])
    ]);
  }

  function renderEmptyState() {
    return el('div', { class: 'text-center p-8 bg-gray-50 rounded-lg' }, [
      el('div', { class: 'text-6xl mb-4' }, '📋'),
      el('h3', { class: 'text-xl font-bold mb-2' },
        (filterEstado || filterPrioridad) ? 'No hay trabajos con estos filtros' : 'No hay trabajos registrados'
      ),
      el('p', { class: 'text-gray-600 mb-4' },
        (filterEstado || filterPrioridad)
          ? 'Intenta ajustando los filtros'
          : 'Comienza agregando tu primer trabajo'
      ),
      !(filterEstado || filterPrioridad) ? el('button', {
        class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
        onclick: () => {
          showForm = true;
          render();
        }
      }, '+ Crear Primer Trabajo') : null
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border' }, [
      el('h2', { class: 'text-xl font-bold mb-4' },
        editingTrabajo ? 'Editar Trabajo' : 'Nuevo Trabajo'
      ),
      el('form', {
        class: 'max-w-3xl',
        onsubmit: (e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.target));
        }
      }, [
        // Cliente y Empresa
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Cliente *'),
            el('select', {
              name: 'cliente_id',
              class: 'w-full p-2 border rounded',
              required: true
            }, [
              el('option', { value: '' }, 'Seleccionar cliente...'),
              ...clientes.map(c =>
                el('option', {
                  value: c.id,
                  selected: editingTrabajo?.cliente_id === c.id
                }, c.apellido ? `${c.nombre} ${c.apellido}` : c.nombre)
              )
            ])
          ]),
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Empresa (opcional)'),
            el('select', {
              name: 'empresa_id',
              class: 'w-full p-2 border rounded'
            }, [
              el('option', { value: '' }, 'Sin empresa'),
              ...empresas.map(e =>
                el('option', {
                  value: e.id,
                  selected: editingTrabajo?.empresa_id === e.id
                }, e.nombre)
              )
            ])
          ])
        ]),
        // Detalles
        el('div', { class: 'mb-4' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Detalles del Trabajo *'),
          el('textarea', {
            name: 'detalles',
            class: 'w-full p-2 border rounded',
            rows: 4,
            required: true,
            placeholder: 'Describe el trabajo a realizar...'
          }, editingTrabajo?.detalles || '')
        ]),
        // Presupuesto, Pagado, Fecha
        el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' }, [
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Presupuesto *'),
            el('input', {
              type: 'number',
              name: 'presupuesto',
              class: 'w-full p-2 border rounded',
              step: '0.01',
              min: '0',
              required: true,
              value: editingTrabajo?.presupuesto || ''
            })
          ]),
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Monto Pagado'),
            el('input', {
              type: 'number',
              name: 'monto_pagado',
              class: 'w-full p-2 border rounded',
              step: '0.01',
              min: '0',
              value: editingTrabajo?.monto_pagado || '0'
            })
          ]),
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Fecha de Entrega'),
            el('input', {
              type: 'date',
              name: 'fecha_entrega',
              class: 'w-full p-2 border rounded',
              value: editingTrabajo?.fecha_entrega?.split('T')[0] || ''
            })
          ])
        ]),
        // Estado y Prioridad
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Estado *'),
            el('select', {
              name: 'estado',
              class: 'w-full p-2 border rounded',
              required: true
            }, ESTADOS.map(estado =>
              el('option', {
                value: estado,
                selected: editingTrabajo?.estado === estado || (!editingTrabajo && estado === 'Presupuesto')
              }, estado)
            ))
          ]),
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Prioridad *'),
            el('select', {
              name: 'prioridad',
              class: 'w-full p-2 border rounded',
              required: true
            }, PRIORIDADES.map(prioridad =>
              el('option', {
                value: prioridad,
                selected: editingTrabajo?.prioridad === prioridad || (!editingTrabajo && prioridad === 'Media')
              }, prioridad)
            ))
          ])
        ]),
        // Botones
        el('div', { class: 'flex flex-col sm:flex-row gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingTrabajo ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded bg-white',
            onclick: () => {
              showForm = false;
              editingTrabajo = null;
              render();
            }
          }, 'Cancelar')
        ])
      ])
    ]);
  }

  function renderDetailsList(items) {
    return el('div', { class: 'space-y-2' }, items.map(trabajo =>
      el('details', { class: 'bg-white border rounded-lg' }, [
        el('summary', {
          class: 'p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-start gap-2'
        }, [
          el('div', { class: 'flex-1' }, [
            el('div', { class: 'font-bold text-lg mb-1' }, getClienteName(trabajo)),
            el('div', { class: 'flex flex-wrap gap-2 mb-1' }, [
              el('span', {
                class: `px-2 py-1 rounded text-xs font-semibold ${getEstadoBadgeClass(trabajo.estado)}`
              }, trabajo.estado),
              el('span', {
                class: `px-2 py-1 rounded text-xs font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`
              }, trabajo.prioridad)
            ]),
            el('div', { class: 'text-sm font-semibold text-green-700' }, formatCurrency(trabajo.presupuesto))
          ]),
          el('span', { class: 'text-gray-400 text-xl' }, '▼')
        ]),
        el('div', { class: 'p-4 pt-0 border-t space-y-3' }, [
          trabajo.empresa ? el('div', {}, [
            el('div', { class: 'text-sm font-semibold text-gray-700' }, '🏢 Empresa'),
            el('div', {}, trabajo.empresa.nombre)
          ]) : null,
          el('div', {}, [
            el('div', { class: 'text-sm font-semibold text-gray-700 mb-1' }, 'Detalles'),
            el('div', { class: 'text-sm' }, trabajo.detalles)
          ]),
          el('div', { class: 'grid grid-cols-2 gap-2 text-sm' }, [
            el('div', {}, [
              el('div', { class: 'text-gray-600' }, 'Pagado'),
              el('div', { class: 'font-semibold' }, formatCurrency(trabajo.monto_pagado))
            ]),
            el('div', {}, [
              el('div', { class: 'text-gray-600' }, 'Entrega'),
              el('div', { class: 'font-semibold' }, formatDate(trabajo.fecha_entrega))
            ])
          ]),
          trabajo.creador ? el('div', { class: 'text-xs text-gray-500' }, 
            `Creado por: ${trabajo.creador.name}`
          ) : null,
          el('div', { class: 'flex gap-2 pt-2 border-t' }, [
            el('button', {
              class: 'flex-1 bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',
              onclick: () => handleEdit(trabajo)
            }, 'Editar'),
            el('button', {
              class: 'flex-1 bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',
              onclick: () => handleDelete(trabajo.id)
            }, 'Eliminar')
          ])
        ].filter(Boolean))
      ])
    ));
  }

  function renderCardsGrid(items) {
    return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, items.map(trabajo =>
      el('div', { class: 'bg-white p-4 rounded-lg border' }, [
        el('div', { class: 'mb-3' }, [
          el('div', { class: 'flex justify-between items-start mb-2' }, [
            el('h3', { class: 'text-lg font-bold' }, getClienteName(trabajo)),
            el('span', {
              class: `px-2 py-1 rounded text-xs font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`
            }, trabajo.prioridad)
          ]),
          el('div', { class: 'mb-2' }, [
            el('span', {
              class: `px-2 py-1 rounded text-xs font-semibold ${getEstadoBadgeClass(trabajo.estado)}`
            }, trabajo.estado)
          ]),
          el('p', { class: 'text-sm text-gray-600 mb-2 line-clamp-2' }, trabajo.detalles),
          el('div', { class: 'flex justify-between text-sm' }, [
            el('div', {}, [
              el('div', { class: 'text-gray-600' }, 'Presupuesto'),
              el('div', { class: 'font-semibold text-green-700' }, formatCurrency(trabajo.presupuesto))
            ]),
            el('div', { class: 'text-right' }, [
              el('div', { class: 'text-gray-600' }, 'Entrega'),
              el('div', { class: 'font-semibold' }, formatDate(trabajo.fecha_entrega))
            ])
          ])
        ]),
        el('div', { class: 'flex gap-2 pt-3 border-t' }, [
          el('button', {
            class: 'flex-1 bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleEdit(trabajo)
          }, 'Editar'),
          el('button', {
            class: 'flex-1 bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleDelete(trabajo.id)
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
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Cliente'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Detalles'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Presupuesto'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Estado'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Prioridad'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Entrega'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Acciones')
              ])
            ]),
            el('tbody', { class: 'bg-white divide-y divide-gray-200' }, items.map(trabajo =>
              el('tr', { class: 'hover:bg-gray-50' }, [
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('div', { class: 'font-semibold text-gray-900' }, getClienteName(trabajo)),
                  trabajo.empresa ? el('div', { class: 'text-xs text-gray-600' }, trabajo.empresa.nombre) : null
                ].filter(Boolean)),
                el('td', { class: 'px-6 py-4 max-w-xs' }, [
                  el('div', { class: 'text-sm text-gray-600 truncate' }, trabajo.detalles)
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('div', { class: 'font-semibold text-green-700' }, formatCurrency(trabajo.presupuesto)),
                  el('div', { class: 'text-xs text-gray-600' }, `Pagado: ${formatCurrency(trabajo.monto_pagado)}`)
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('span', {
                    class: `px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(trabajo.estado)}`
                  }, trabajo.estado)
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('span', {
                    class: `px-3 py-1 rounded-full text-xs font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`
                  }, trabajo.prioridad)
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600' }, formatDate(trabajo.fecha_entrega)),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm' }, [
                  el('div', { class: 'flex flex-col gap-2' }, [
                    el('div', { class: 'flex gap-3' }, [
                      el('button', {
                        class: 'text-primary font-semibold hover:underline',
                        onclick: () => handleEdit(trabajo)
                      }, 'Editar'),
                      el('button', {
                        class: 'text-red-600 font-semibold hover:underline',
                        onclick: () => handleDelete(trabajo.id)
                      }, 'Eliminar')
                    ]),
                    trabajo.creador ? el('div', { class: 'text-xs text-gray-500' },
                      `Por: ${trabajo.creador.name}`
                    ) : null
                  ].filter(Boolean))
                ])
              ])
            ))
          ])
        ])
      ])
    ]);
  }
}