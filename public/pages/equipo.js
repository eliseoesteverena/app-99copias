import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderEquipo(container, params) {
  // 1. Estado local
  let perfiles = [];
  let currentUser = null;
  let currentUserProfile = null;
  let loading = true;
  let error = null;
  let showForm = false;
  let editingPerfil = null;

  // 2. Inicialización
  await init();

  // 3. Funciones auxiliares
  async function init() {
    await loadCurrentUser();
    await loadPerfiles();
    render();
  }

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user;

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      currentUserProfile = perfil;
    } catch (err) {
      console.error('Error al cargar usuario actual:', err);
    }
  }

  async function loadPerfiles() {
    try {
      loading = true;
      render();

      if (!currentUserProfile) {
        throw new Error('No se pudo cargar el perfil del usuario');
      }

      const { data, error: err } = await supabase
        .from('perfiles')
        .select('*')
        .eq('grupo_id', currentUserProfile.grupo_id)
        .order('name', { ascending: true });

      if (err) throw err;
      perfiles = data || [];
    } catch (err) {
      console.error('Error al cargar perfiles:', err);
      error = err.message;
    } finally {
      loading = false;
      render();
    }
  }

  async function handleSubmit(formData) {
    try {
      const perfilData = {
        name: formData.get('name'),
        avatar: formData.get('avatar')
      };

      const { error: err } = await supabase
        .from('perfiles')
        .update(perfilData)
        .eq('id', editingPerfil.id);

      if (err) throw err;

      showForm = false;
      editingPerfil = null;
      await loadPerfiles();
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      alert('Error al actualizar: ' + err.message);
    }
  }

  async function handleChangeRole(perfilId, newRole) {
    if (currentUserProfile.rol !== 'admin') {
      alert('Solo los administradores pueden cambiar roles');
      return;
    }

    if (!confirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) return;

    try {
      const { error: err } = await supabase
        .from('perfiles')
        .update({ rol: newRole })
        .eq('id', perfilId);

      if (err) throw err;
      await loadPerfiles();
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      alert('Error al cambiar rol: ' + err.message);
    }
  }

  async function handleRemoveFromGroup(perfilId) {
    if (currentUserProfile.rol !== 'admin') {
      alert('Solo los administradores pueden eliminar miembros');
      return;
    }

    if (perfilId === currentUser.id) {
      alert('No puedes eliminarte a ti mismo del grupo');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este miembro del grupo?')) return;

    try {
      // En un caso real, aquí podrías mover al usuario a un grupo "sin asignar"
      // o eliminar su perfil por completo. Por ahora, solo lo desvinculamos.
      const { error: err } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', perfilId);

      if (err) throw err;
      await loadPerfiles();
    } catch (err) {
      console.error('Error al eliminar miembro:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  function handleEdit(perfil) {
    // Solo permitir editar el propio perfil o si eres admin
    if (currentUserProfile.rol !== 'admin' && perfil.id !== currentUser.id) {
      alert('Solo puedes editar tu propio perfil');
      return;
    }

    editingPerfil = perfil;
    showForm = true;
    render();
  }

  function isAdmin() {
    return currentUserProfile?.rol === 'admin';
  }

  function render() {
    container.innerHTML = '';

    if (loading) {
      mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [
        el('div', { class: 'text-gray-600' }, 'Cargando equipo...')
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

    mount(container, 'div', { class: 'container p-6' }, [
      // Header
      el('div', { class: 'flex justify-between items-center mb-6' }, [
        el('h1', { class: 'text-3xl font-bold' }, 'Mi Equipo'),
        isAdmin() ? el('button', {
          class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
          onclick: () => alert('Funcionalidad de invitación en desarrollo')
        }, '+ Invitar Miembro') : null
      ].filter(Boolean)),

      // Información del rol actual
      el('div', { class: 'bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200' }, [
        el('p', { class: 'text-sm text-blue-800' }, [
          el('strong', {}, 'Tu rol: '),
          currentUserProfile?.rol === 'admin' ? 'Administrador' : 'Miembro'
        ])
      ]),

      // Formulario de edición
      showForm ? renderForm() : null,

      // Tabla de miembros
      perfiles.length === 0 ?
        el('div', { class: 'text-center p-8 text-gray-500' }, 'No hay miembros en el equipo') :
        renderTable(perfiles)
    ].filter(Boolean));
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-6 rounded-lg mb-6 border' }, [
      el('h2', { class: 'text-xl font-bold mb-4' }, 'Editar Perfil'),
      el('form', {
        class: 'max-w-lg',
        onsubmit: (e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.target));
        }
      }, [
        // Nombre
        el('div', { class: 'mb-4' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'Nombre Completo *'),
          el('input', {
            type: 'text',
            name: 'name',
            class: 'w-full p-2 border rounded',
            required: true,
            value: editingPerfil?.name || ''
          })
        ]),
        // Avatar URL
        el('div', { class: 'mb-4' }, [
          el('label', { class: 'block mb-2 font-semibold' }, 'URL del Avatar'),
          el('input', {
            type: 'url',
            name: 'avatar',
            class: 'w-full p-2 border rounded',
            placeholder: 'https://ejemplo.com/avatar.jpg',
            value: editingPerfil?.avatar || ''
          }),
          el('p', { class: 'text-sm text-gray-600 mt-1' }, 
            'Sube una imagen a Supabase Storage y pega la URL aquí'
          )
        ]),
        // Botones
        el('div', { class: 'flex gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, 'Actualizar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded',
            onclick: () => {
              showForm = false;
              editingPerfil = null;
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
            el('th', { class: 'p-3 text-left font-semibold' }, 'Avatar'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Nombre'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Rol'),
            el('th', { class: 'p-3 text-left font-semibold' }, 'Acciones')
          ])
        ]),
        el('tbody', {}, items.map(perfil =>
          el('tr', { 
            class: `border-t ${perfil.id === currentUser.id ? 'bg-blue-50' : ''}`
          }, [
            // Avatar
            el('td', { class: 'p-3' }, [
              perfil.avatar ?
                el('img', {
                  src: perfil.avatar,
                  alt: perfil.name,
                  class: 'w-12 h-12 rounded-full object-cover',
                  onerror: (e) => e.target.src = 'https://via.placeholder.com/48'
                }) :
                el('div', {
                  class: 'w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600'
                }, perfil.name?.charAt(0).toUpperCase() || 'U')
            ]),
            // Nombre
            el('td', { class: 'p-3' }, [
              el('div', { class: 'font-semibold' }, perfil.name),
              perfil.id === currentUser.id ? 
                el('span', { class: 'text-xs text-blue-600' }, '(Tú)') : null
            ].filter(Boolean)),
            // Rol
            el('td', { class: 'p-3' }, [
              el('span', {
                class: `px-3 py-1 rounded-full text-sm font-semibold ${
                  perfil.rol === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`
              }, perfil.rol === 'admin' ? 'Administrador' : 'Miembro')
            ]),
            // Acciones
            el('td', { class: 'p-3' }, [
              el('div', { class: 'flex gap-2 flex-wrap' }, [
                // Editar perfil
                (isAdmin() || perfil.id === currentUser.id) ?
                  el('button', {
                    class: 'text-primary font-semibold',
                    onclick: () => handleEdit(perfil)
                  }, 'Editar') : null,
                // Cambiar rol (solo admin)
                isAdmin() && perfil.id !== currentUser.id ?
                  el('button', {
                    class: 'text-blue-600 font-semibold',
                    onclick: () => handleChangeRole(
                      perfil.id,
                      perfil.rol === 'admin' ? 'miembro' : 'admin'
                    )
                  }, perfil.rol === 'admin' ? 'Quitar Admin' : 'Hacer Admin') : null,
                // Eliminar (solo admin)
                isAdmin() && perfil.id !== currentUser.id ?
                  el('button', {
                    class: 'text-red-600 font-semibold',
                    onclick: () => handleRemoveFromGroup(perfil.id)
                  }, 'Eliminar') : null
              ].filter(Boolean))
            ])
          ])
        ))
      ])
    ]);
  }
}