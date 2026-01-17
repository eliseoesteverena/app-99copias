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
      
      // Obtener grupo_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();
      
      // Cargar clientes del grupo
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
        email: formData.get('email'),
        telefono: formData.get('telefono')
      };
      
      // Obtener grupo_id del usuario
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('grupo_id')
        .eq('id', user.id)
        .single();
      
      if (editingCliente) {
        // Actualizar
        const { error: err } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', editingCliente.id)
          .eq('grupo_id', perfil.grupo_id);
        
        if (err) throw err;
      } else {
        // Crear
        const { error: err } = await supabase
          .from('clientes')
          .insert({
            ...clienteData,
            grupo_id: perfil.grupo_id
          });
        
        if (err) throw err;
      }
      
      // Resetear formulario
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
      c.email.toLowerCase().includes(searchTerm)
    );
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
    
    // Renderizado principal
    const filteredClientes = getFilteredClientes();
    
    mount(container, 'div', { class: 'container p-6' }, [
      // Header
      el('div', { class: 'flex justify-between items-center mb-6' }, [
        el('h1', { class: 'text-3xl font-bold' }, 'Clientes'),
        el('button', {
          class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
          onclick: () => {
            editingCliente = null;
            showForm = true;
            render();
          }
        }, '+ Nuevo Cliente')
      ]),
      
      // Formulario (condicional)
      showForm ? renderForm() : null,
      
      // Búsqueda
      el('div', { class: 'mb-4' }, [
        el('input', {
          type: 'text',
          placeholder: 'Buscar por nombre o email...',
          class: 'w-full max-w-md p-3 border rounded',
          value: searchTerm,
          oninput: (e) => handleSearch(e.target.value)
        })
      ]),
      
      // Empty state
      filteredClientes.length === 0 ?
      el('div', { class: 'text-center p-8 text-gray-500' },
        searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'
      ) :
      // Tabla
      renderTable(filteredClientes)
    ].filter(Boolean));
  }
  
  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-6 rounded-lg mb-6 border' }, [
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
        // Grid de campos
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
          ])
        ]),
        // Teléfono
        el('div', { class: 'mb-4' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Teléfono'),
          el('input', {
            type: 'tel',
            name: 'telefono',
            class: 'w-full p-2 border rounded',
            value: editingCliente?.telefono || ''
          })
        ]),
        // Botones
        el('div', { class: 'flex gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingCliente ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded',
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
  
  function renderTable(items) {
    return el('div', { class: 'overflow-x-auto' }, [
      el('table', { class: 'w-full border rounded-lg' }, [
        el('thead', { class: 'bg-gray-100' }, [
          el('tr', {}, [
            el('th', { class: 'p-3 text-left font-semibold' }, 'Nombre'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Email'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Teléfono'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Acciones')
          ])
        ]),
        el('tbody', {}, items.map(cliente =>
          el('tr', { class: 'border-t' }, [
            el('td', { class: 'p-3' }, cliente.nombre),
            el('td', { class: 'p-3 text-gray-600' }, cliente.email),
            el('td', { class: 'p-3 text-gray-600' }, cliente.telefono || '-'),
            el('td', { class: 'p-3' }, [
              el('div', { class: 'flex gap-2' }, [
                el('button', {
                  class: 'text-primary font-semibold',
                  onclick: () => handleEdit(cliente)
                }, 'Editar'),
                el('button', {
                  class: 'text-red-600 font-semibold',
                  onclick: () => handleDelete(cliente.id)
                }, 'Eliminar')
              ])
            ])
          ])
        ))
      ])
    ]);
  }
}