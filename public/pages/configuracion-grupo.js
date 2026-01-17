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
          avatar: formData.get('avatar')
        };
        
        const { error: err } = await supabase
          .from('grupos_trabajo')
          .update(grupoData)
          .eq('id', currentUserProfile.grupo_id);
        
        if (err) throw err;
        
        await loadGrupo();
        alert('Configuración actualizada correctamente');
      } catch (err) {
        console.error('Error al actualizar grupo:', err);
        alert('Error al actualizar: ' + err.message);
      } finally {
        saving = false;
        render();
      }
    }
    
    function formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('es-AR');
    }
    
    function render() {
      container.innerHTML = '';
      
      // Access denied
      if (error && error.includes('Acceso denegado')) {
        mount(container, 'div', { class: 'container p-6' }, [
          el('div', { class: 'max-w-2xl mx-auto' }, [
            el('div', { class: 'bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg' }, [
              el('h2', { class: 'text-xl font-bold mb-2' }, '🔒 Acceso Denegado'),
              el('p', {}, error),
              el('p', { class: 'mt-4 text-sm' }, 'Solo los administradores del grupo pueden acceder a esta sección.')
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
      mount(container, 'div', { class: 'container p-6' }, [
            el('div', { class: 'max-w-3xl mx-auto' }, [
                // Header
                el('h1', { class: 'text-3xl font-bold mb-6' }, 'Configuración del Grupo'),
                
                // Formulario de identidad
                el('div', { class: 'bg-white p-6 rounded-lg border mb-6' }, [
                    el('h2', { class: 'text-xl font-bold mb-4' }, 'Identidad del Equipo'),
                    el('form', {
                        onsubmit: (e) => {
                          e.preventDefault();
                          handleSubmit(new FormData(e.target));
                        }
                      }, [
                        // Preview del avatar
                        grupo?.avatar ? el('div', { class: 'mb-4 flex justify-center' }, [
                          el('img', {
                            src: grupo.avatar,
                            alt: 'Logo del equipo',
                            class: 'w-32 h-32 rounded-lg object-cover border-2 border-gray-200',
                            onerror: (e) => e.target.src = 'https://via.placeholder.com/128'
                          })
                        ]) : null,
                        
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
                            el('label', { class: 'block mb-2 font-semibold' }, 'Logo del Equipo (URL)'),
                            el('input', {
                              type: 'url',
                              name: 'avatar',
                              class: 'w-full p-3 border rounded',
                              value: grupo?.avatar || '',
                              placeholder: 'https://ejemplo.com/logo.png'
                            }),
                            el('p', { class: 'text-sm text-gray-600 mt-2' },
                              'Sube tu logo a Supabase Storage y pega la URL aquí. Recomendado: 256x256px, formato PNG o JPG.'
                            )
                        ]),

// Botón de guardar
el('button', {
type: 'submit',
class: `w-full px-6 py-3 rounded font-semibold ${
                saving 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : 'bg-primary text-white'
              }`,
disabled: saving
}, saving ? 'Guardando...' : 'Guardar Cambios')
])
]),

// Información de auditoría
el('div', { class: 'bg-gray-50 p-6 rounded-lg border' }, [
    el('h2', { class: 'text-xl font-bold mb-4' }, 'Información del Grupo'),
    el('div', { class: 'space-y-3' }, [
      el('div', { class: 'flex justify-between items-center py-2 border-b' }, [
        el('span', { class: 'font-semibold text-gray-700' }, 'ID del Grupo:'),
        el('span', { class: 'text-gray-600 font-mono text-sm' }, grupo?.id || '-')
      ]),
      el('div', { class: 'flex justify-between items-center py-2 border-b' }, [
        el('span', { class: 'font-semibold text-gray-700' }, 'Fecha de Creación:'),
        el('span', { class: 'text-gray-600' }, formatDate(grupo?.created_at))
      ]),
      el('div', { class: 'flex justify-between items-center py-2' }, [
        el('span', { class: 'font-semibold text-gray-700' }, 'Última Actualización:'),
        el('span', { class: 'text-gray-600' }, formatDate(grupo?.update_at))
      ])
    ])
  ]),
  
  // Zona de peligro (opcional - para futuras funcionalidades)
  el('div', { class: 'bg-red-50 p-6 rounded-lg border border-red-200 mt-6' }, [
    el('h2', { class: 'text-xl font-bold text-red-800 mb-2' }, '⚠️ Zona de Peligro'),
    el('p', { class: 'text-red-700 mb-4' },
      'Las acciones en esta sección son irreversibles y afectarán a todos los miembros del equipo.'
    ),
    el('button', {
      class: 'px-4 py-2 bg-red-600 text-white rounded font-semibold opacity-50 cursor-not-allowed',
      disabled: true,
      onclick: () => alert('Funcionalidad en desarrollo')
    }, 'Eliminar Grupo (Próximamente)')
  ])
])
]);
}
}