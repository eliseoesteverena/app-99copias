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
  let viewingClientesEmpresaId = null;

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

  async function handleViewClientes(empresaId) {
    viewingClientesEmpresaId = empresaId;
    render();
  }

  function getFilteredEmpresas() {
    if (!searchTerm) return empresas;
    return empresas.filter(e =>
      e.nombre.toLowerCase().includes(searchTerm) ||
      e.cuit.toLowerCase().includes(searchTerm)
    );
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

    mount(container, 'div', { class: 'container p-6' }, [
      // Header
      el('div', { class: 'flex justify-between items-center mb-6' }, [
        el('h1', { class: 'text-3xl font-bold' }, 'Empresas'),
        el('button', {
          class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
          onclick: () => {
            editingEmpresa = null;
            showForm = true;
            render();
          }
        }, '+ Nueva Empresa')
      ]),

      // Formulario
      showForm ? renderForm() : null,

      // Búsqueda
      el('div', { class: 'mb-4' }, [
        el('input', {
          type: 'text',
          placeholder: 'Buscar por nombre o CUIT...',
          class: 'w-full max-w-md p-3 border rounded',
          value: searchTerm,
          oninput: (e) => handleSearch(e.target.value)
        })
      ]),

      // Empty state
      filteredEmpresas.length === 0 ?
        el('div', { class: 'text-center p-8 text-gray-500' },
          searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'
        ) :
        // Tabla
        renderTable(filteredEmpresas)
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-6 rounded-lg mb-6 border' }, [
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
          // Nombre Comercial
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
          // CUIT
          el('div', {}, [
            el('label', { class: 'block mb-2 font-semibold' }, 'CUIT *'),
            el('input', {
              type: 'text',
              name: 'cuit',
              class: 'w-full p-2 border rounded',
              required: true,
              pattern: '[0-9]{11}',
              placeholder: '20123456789',
              value: editingEmpresa?.cuit || ''
            })
          ])
        ]),
        // Razón Social
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
        // Botones
        el('div', { class: 'flex gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, editingEmpresa ? 'Actualizar' : 'Guardar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded',
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

  function renderTable(items) {
    return el('div', { class: 'overflow-x-auto' }, [
      el('table', { class: 'w-full border rounded-lg' }, [
        el('thead', { class: 'bg-gray-100' }, [
          el('tr', {}, [
            el('th', { class: 'p-3 text-left font-semibold' }, 'Nombre Comercial'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Razón Social'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'CUIT'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Acciones')
          ])
        ]),
        el('tbody', {}, items.map(empresa =>
          el('tr', { class: 'border-t' }, [
            el('td', { class: 'p-3 font-semibold' }, empresa.nombre),
            el('td', { class: 'p-3 text-gray-600' }, empresa.razon_social),
            el('td', { class: 'p-3 text-gray-600' }, empresa.cuit),
            el('td', { class: 'p-3' }, [
              el('div', { class: 'flex gap-2 flex-wrap' }, [
                el('button', {
                  class: 'text-primary font-semibold',
                  onclick: () => handleEdit(empresa)
                }, 'Editar'),
                el('button', {
                  class: 'text-blue-600 font-semibold',
                  onclick: () => handleViewClientes(empresa.id)
                }, 'Ver Contactos'),
                el('button', {
                  class: 'text-red-600 font-semibold',
                  onclick: () => handleDelete(empresa.id)
                }, 'Eliminar')
              ])
            ])
          ])
        ))
      ])
    ]);
  }
}