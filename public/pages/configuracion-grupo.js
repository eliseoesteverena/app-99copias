import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderConfiguracionGrupo(container, params) {
  // 1. Estado local
  let grupo = null;
  let currentUserProfile = null;
  let loading = true;
  let error = null;
  let saving = false;
  
  // 2. Inicialización
  await init();
  
  // 3. Funciones auxiliares
  async function init() {
    await loadCurrentUser();
    
    // Verificar permisos de admin
    if (!currentUserProfile || currentUserProfile.rol !== 'admin') {
      error = 'Acceso denegado. Solo los administradores pueden acceder a esta página.';
      render();
      return;
    }
    
    await loadGrupo();
    render();
  }
  
  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      currentUserProfile = perfil;
    } catch (err) {
      console.error('Error al cargar usuario:', err);
      error = err.message;
    }
  }
  
  async function loadGrupo() {
    try {
      loading = true;
      render();
      
      const { data, error: err } = await supabase
        .from('grupos_trabajo')
        .select('*')
        .eq('id', currentUserProfile.grupo_id)
        .single();
      
      if (err) throw err;
      grupo = data;
    } catch (err) {
      console.error('Error al cargar grupo:', err);
      error = err.message;
    } finally {
      loading = false;
      render();
    }
  }
  
  async function handleSubmit(formData) {
    try {
      saving = true;
      render();
      
      const grupoData = {
        name: formData.get('name'),
        avatar: formData.get('avatar') || null
      };
      
      const { error: err } = await supabase
        .from('grupos_trabajo')
        .update(grupoData)
        .eq('id', currentUserProfile.grupo_id);
      
      if (err) throw err;
      
      await loadGrupo();
      alert('✅ Configuración actualizada correctamente');
    } catch (err) {
      console.error('Error al actualizar grupo:', err);
      alert('❌ Error al actualizar: ' + err.message);
    } finally {
      saving = false;
      render();
    }
  }
  
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function render() {
    container.innerHTML = '';
    
    // Access denied
    if (error && error.includes('Acceso denegado')) {
      mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
        el('div', { class: 'max-w-2xl mx-auto' }, [
          el('div', { class: 'bg-red-50 border border-red-300 text-red-800 px-6 py-8 rounded-lg text-center' }, [
            el('div', { class: 'text-6xl mb-4' }, '🔒'),
            el('h2', { class: 'text-2xl font-bold mb-3' }, 'Acceso Denegado'),
            el('p', { class: 'mb-4' }, error),
            el('p', { class: 'text-sm' }, 'Solo los administradores del grupo pueden acceder a esta sección.')
          ])
        ])
      ]);
      return;
    }
    
    // Loading
    if (loading) {
      mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [
        el('div', { class: 'text-gray-600' }, 'Cargando configuración...')
      ]);
      return;
    }
    
    // Error
    if (error) {
      mount(container, 'div', { class: 'p-6' }, [
        el('div', {
          class: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'
        }, error)
      ]);
      return;
    }
    
    // Renderizado principal
    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      el('div', { class: 'max-w-3xl mx-auto' }, [
        // Header
        el('div', { class: 'mb-8' }, [
          el('h1', { class: 'text-2xl sm:text-3xl font-bold mb-2' }, 'Configuración del Grupo'),
          el('p', { class: 'text-gray-600' }, 'Administra la información de tu equipo')
        ]),
        
        // Formulario de identidad
        el('div', { class: 'bg-white p-4 sm:p-6 rounded-lg border mb-6' }, [
          el('h2', { class: 'text-xl font-bold mb-4' }, '🏢 Identidad del Equipo'),
          el('form', {
            onsubmit: (e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.target));
            }
          }, [
            // Preview del avatar
            el('div', { class: 'mb-6' }, [
              el('div', { class: 'flex flex-col sm:flex-row items-center gap-4' }, [
                grupo?.avatar ?
                el('img', {
                  src: grupo.avatar,
                  alt: 'Logo del equipo',
                  class: 'w-32 h-32 rounded-lg object-cover border-2 border-gray-200',
                  onerror: (e) => {
                    e.target.src = 'https://via.placeholder.com/128?text=Logo';
                  }
                }) :
                el('div', {
                  class: 'w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400'
                }, grupo?.name?.charAt(0).toUpperCase() || '?'),
                el('div', { class: 'flex-1 text-center sm:text-left' }, [
                  el('p', { class: 'text-sm text-gray-600 mb-2' }, 'Logo actual del equipo'),
                  el('p', { class: 'text-xs text-gray-500' }, 'Recomendado: 256x256px, formato PNG o JPG')
                ])
              ])
            ]),
            
            // Nombre del equipo
            el('div', { class: 'mb-4' }, [
              el('label', { class: 'block mb-2 font-semibold' }, 'Nombre del Equipo *'),
              el('input', {
                type: 'text',
                name: 'name',
                class: 'w-full p-3 border rounded',
                required: true,
                value: grupo?.name || '',
                placeholder: 'Mi Empresa SRL'
              })
            ]),
            
            // Avatar/Logo
            el('div', { class: 'mb-6' }, [
              el('label', { class: 'block mb-2 font-semibold' }, 'URL del Logo'),
              el('input', {
                type: 'url',
                name: 'avatar',
                class: 'w-full p-3 border rounded',
                value: grupo?.avatar || '',
                placeholder: 'https://ejemplo.com/logo.png'
              }),
              el('p', { class: 'text-sm text-gray-600 mt-2' },
                '💡 Sube tu logo a Supabase Storage y pega la URL aquí. Recomendado: 256x256px, formato PNG o JPG.'
              )
            ]),
            
            // Botón de guardar
            el('button', {
              type: 'submit',
              class: `w-full px-6 py-3 rounded font-semibold ${
                saving
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`,
              disabled: saving
            }, saving ? '⏳ Guardando...' : '💾 Guardar Cambios')
          ])
        ]),
        
        // Información de auditoría
        el('div', { class: 'bg-gray-50 p-4 sm:p-6 rounded-lg border mb-6' }, [
          el('h2', { class: 'text-xl font-bold mb-4' }, '📊 Información del Grupo'),
          el('div', { class: 'space-y-3' }, [
            el('div', { class: 'flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b' }, [
              el('span', { class: 'font-semibold text-gray-700 mb-1 sm:mb-0' }, 'ID del Grupo:'),
              el('span', { class: 'text-gray-600 font-mono text-sm break-all' }, grupo?.id || '-')
            ]),
            el('div', { class: 'flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b' }, [
              el('span', { class: 'font-semibold text-gray-700 mb-1 sm:mb-0' }, 'Fecha de Creación:'),
              el('span', { class: 'text-gray-600 text-sm' }, formatDate(grupo?.created_at))
            ]),
            el('div', { class: 'flex flex-col sm:flex-row sm:justify-between sm:items-center py-2' }, [
              el('span', { class: 'font-semibold text-gray-700 mb-1 sm:mb-0' }, 'Última Actualización:'),
              el('span', { class: 'text-gray-600 text-sm' }, formatDate(grupo?.updated_at))
            ])
          ])
        ]),
        
        // Instrucciones de Supabase Storage
        el('div', { class: 'bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200 mb-6' }, [
          el('h3', { class: 'font-bold mb-2 flex items-center gap-2' }, [
            el('span', {}, '💡'),
            el('span', {}, 'Cómo subir tu logo a Supabase Storage')
          ]),
          el('ol', { class: 'text-sm text-gray-700 space-y-2 ml-4' }, [
            el('li', { class: 'list-decimal' }, 'Ve a tu Dashboard de Supabase → Storage'),
            el('li', { class: 'list-decimal' }, 'Crea un bucket público llamado "avatars" (si no existe)'),
            el('li', { class: 'list-decimal' }, 'Sube tu imagen (logo.png o logo.jpg)'),
            el('li', { class: 'list-decimal' }, 'Copia la URL pública de la imagen'),
            el('li', { class: 'list-decimal' }, 'Pégala en el campo "URL del Logo" arriba')
          ])
        ]),
        
        // Zona de peligro
        el('div', { class: 'bg-red-50 p-4 sm:p-6 rounded-lg border border-red-200' }, [
          el('h2', { class: 'text-xl font-bold text-red-800 mb-2 flex items-center gap-2' }, [
            el('span', {}, '⚠️'),
            el('span', {}, 'Zona de Peligro')
          ]),
          el('p', { class: 'text-red-700 mb-4 text-sm' },
            'Las acciones en esta sección son irreversibles y afectarán a todos los miembros del equipo.'
          ),
          el('button', {
            class: 'px-4 py-2 bg-red-100 text-red-400 rounded font-semibold cursor-not-allowed border border-red-200',
            disabled: true,
            title: 'Funcionalidad en desarrollo'
          }, '🗑️ Eliminar Grupo (Próximamente)')
        ])
      ])
    ]);
  }
}