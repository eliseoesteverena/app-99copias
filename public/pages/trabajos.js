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
    
    // Estados y prioridades (Enums)
    const ESTADOS = ['Presupuesto', 'Aprobado', 'En Curso', 'Completado', 'Archivado'];
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
          cliente:clientes(id, nombre),
          empresa:empresas(id, nombre),
          creador:perfiles!trabajos_created_user_id_fkey(id, name)
        `)
          .eq('grupo_id', perfil.grupo_id)
          .order('fecha_entrega', { ascending: true });
        
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
          .select('id, nombre')
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
          fecha_entrega: formData.get('fecha_entrega')
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
        'Presupuesto': 'bg-gray-200 text-gray-800',
        'Aprobado': 'bg-blue-200 text-blue-800',
        'En Curso': 'bg-yellow-200 text-yellow-800',
        'Completado': 'bg-green-200 text-green-800',
        'Archivado': 'bg-gray-400 text-white'
      };
      return classes[estado] || 'bg-gray-200';
    }
    
    function getPrioridadBadgeClass(prioridad) {
      const classes = {
        'Baja': 'bg-green-100 text-green-800',
        'Media': 'bg-blue-100 text-blue-800',
        'Alta': 'bg-orange-100 text-orange-800',
        'Urgente': 'bg-red-100 text-red-800'
      };
      return classes[prioridad] || 'bg-gray-100';
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
      
      mount(container, 'div', { class: 'container p-6' }, [
            // Header
            el('div', { class: 'flex justify-between items-center mb-6' }, [
              el('h1', { class: 'text-3xl font-bold' }, 'Trabajos'),
              el('button', {
                class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
                onclick: () => {
                  editingTrabajo = null;
                  showForm = true;
                  render();
                }
              }, '+ Nuevo Trabajo')
            ]),
            
            // Formulario
            showForm ? renderForm() : null,
            
            // Filtros
            el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6' }, [
                el('div', {}, [
                    el('label', { class: 'block mb-2 font-semibold' }, 'Filtrar por Estado'),
                    el('select', {
                        class: 'w-full p-2 border rounded',
                        value: filterEstado,
                        onchange: (e) => {
              filterEstado = e.target.value;
              render();
            }
          }, [
            el('option', { value: '' }, 'Todos los estados'),
            ...ESTADOS.map(estado =>
              el('option', { value: estado }, estado)
            )
          ])
        ]),
        el('div', {}, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Filtrar por Prioridad'),
          el('select', {
            class: 'w-full p-2 border rounded',
            value: filterPrioridad,
            onchange: (e) => {
              filterPrioridad = e.target.value;
              render();
            }
          }, [
            el('option', { value: '' }, 'Todas las prioridades'),
            ...PRIORIDADES.map(prioridad =>
              el('option', { value: prioridad }, prioridad)
            )
          ])
        ])
      ]),

      // Empty state
      filteredTrabajos.length === 0 ?
        el('div', { class: 'text-center p-8 text-gray-500' },
          'No hay trabajos que coincidan con los filtros'
        ) :
        // Tabla
        renderTable(filteredTrabajos)
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-6 rounded-lg mb-6 border' }, [
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
        // Grid de campos principales
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          // Cliente
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
                }, c.nombre)
              )
            ])
          ]),
          // Empresa (opcional)
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
            value: editingTrabajo?.detalles || ''
          })
        ]),

        // Grid de datos financieros y fechas
        el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' }, [
          // Presupuesto
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
          // Monto Pagado
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
          // Fecha de Entrega
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'Fecha de Entrega *'),
            el('input', {
              type: 'date',
              name: 'fecha_entrega',
              class: 'w-full p-2 border rounded',
              required: true,
              value: editingTrabajo?.fecha_entrega?.split('T')[0] || ''
            })
          ])
        ]),

        // Grid de estado y prioridad
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4' }, [
          // Estado
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
          // Prioridad
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
        el('div', { class: 'flex gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingTrabajo ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded',
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

  function renderTable(items) {
    return el('div', { class: 'overflow-x-auto' }, [
      el('table', { class: 'w-full border rounded-lg' }, [
        el('thead', { class: 'bg-gray-100' }, [
          el('tr', {}, [
            el('th', { class: 'p-3 text-left font-semibold' }, 'Cliente/Empresa'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Detalles'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Presupuesto'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Estado'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Prioridad'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Entrega'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Acciones')
          ])
        ]),
        el('tbody', {}, items.map(trabajo =>
          el('tr', { class: 'border-t' }, [
            // Cliente/Empresa
            el('td', { class: 'p-3' }, [
              el('div', { class: 'font-semibold' }, trabajo.cliente?.nombre || 'Sin cliente'),
              trabajo.empresa ? el('div', { class: 'text-sm text-gray-600' }, trabajo.empresa.nombre) : null
            ].filter(Boolean)),
            // Detalles (truncados)
            el('td', { class: 'p-3 text-gray-600' }, 
              trabajo.detalles.length > 50 
                ? trabajo.detalles.substring(0, 50) + '...' 
                : trabajo.detalles
            ),
            // Presupuesto
            el('td', { class: 'p-3' }, [
              el('div', { class: 'font-semibold' }, formatCurrency(trabajo.presupuesto)),
              el('div', { class: 'text-sm text-gray-600' }, 
                `Pagado: ${formatCurrency(trabajo.monto_pagado)}`
              )
            ]),
            // Estado
            el('td', { class: 'p-3' }, [
              el('span', {
                class: `px-3 py-1 rounded-full text-sm font-semibold ${getEstadoBadgeClass(trabajo.estado)}`
              }, trabajo.estado)
            ]),
            // Prioridad
            el('td', { class: 'p-3' }, [
              el('span', {
                class: `px-3 py-1 rounded-full text-sm font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`
              }, trabajo.prioridad)
            ]),
            // Fecha de Entrega
            el('td', { class: 'p-3 text-gray-600' }, formatDate(trabajo.fecha_entrega)),
            // Acciones
            el('td', { class: 'p-3' }, [
              el('div', { class: 'flex gap-2' }, [
                el('button', {
                  class: 'text-primary font-semibold',
                  onclick: () => handleEdit(trabajo)
                }, 'Editar'),
                el('button', {
                  class: 'text-red-600 font-semibold',
                  onclick: () => handleDelete(trabajo.id)
                }, 'Eliminar')
              ]),
              // Auditoría (creador)
              trabajo.creador ? el('div', { class: 'text-xs text-gray-500 mt-1' }, 
                `Creado por: ${trabajo.creador.name}`
              ) : null
            ].filter(Boolean))
          ])
        ))
      ])
    ]);
  }
}
