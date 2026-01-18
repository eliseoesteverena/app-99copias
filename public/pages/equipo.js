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
  let currentView = 'auto';

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
        avatar: formData.get('avatar') || null
      };

      const { error: err } = await supabase
        .from('perfiles')
        .update(perfilData)
        .eq('id', editingPerfil.id);

      if (err) throw err;

      showForm = false;
      editingPerfil = null;
      await loadPerfiles();
      if (editingPerfil?.id === currentUser.id) {
        await loadCurrentUser();
      }
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      alert('Error al actualizar: ' + err.message);
    }
  }

  async function handleChangeRole(perfilId, newRole) {
    if (!isAdmin()) {
      alert('Solo los administradores pueden cambiar roles');
      return;
    }

    if (!confirm(`¿Cambiar el rol de este usuario a ${newRole === 'admin' ? 'Administrador' : 'Miembro'}?`)) return;

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
    if (!isAdmin()) {
      alert('Solo los administradores pueden eliminar miembros');
      return;
    }

    if (perfilId === currentUser.id) {
      alert('No puedes eliminarte a ti mismo del grupo');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este miembro del grupo?')) return;

    try {
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
    if (!isAdmin() && perfil.id !== currentUser.id) {
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

  function getInitials(name) {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
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

    mount(container, 'div', { class: 'container p-4 sm:p-6' }, [
      renderHeader(),
      renderUserInfo(),
      showForm ? renderForm() : null,
      renderViewToggle(),
      perfiles.length === 0
        ? renderEmptyState()
        : el('div', {}, [
            currentView === 'details' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'block sm:hidden' : 'block' },
                renderDetailsList(perfiles)
              ) : null,
            currentView === 'cards' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden sm:block md:hidden' : 'block' },
                renderCardsGrid(perfiles)
              ) : null,
            currentView === 'table' || currentView === 'auto' ?
              el('div', { class: currentView === 'auto' ? 'hidden md:block' : 'block' },
                renderTable(perfiles)
              ) : null
          ].filter(Boolean))
    ].filter(Boolean));
  }

  function renderHeader() {
    return el('div', { class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6' }, [
      el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Mi Equipo'),
      isAdmin() ? el('button', {
        class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold w-full sm:w-auto',
        onclick: () => alert('Funcionalidad de invitación en desarrollo')
      }, '+ Invitar Miembro') : null
    ].filter(Boolean));
  }

  function renderUserInfo() {
    return el('div', { class: 'bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200' }, [
      el('div', { class: 'flex items-center gap-3' }, [
        currentUserProfile?.avatar
          ? el('img', {
              src: currentUserProfile.avatar,
              alt: currentUserProfile.name,
              class: 'w-12 h-12 rounded-full object-cover',
              onerror: (e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }
            })
          : el('div', {
              class: 'w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold'
            }, getInitials(currentUserProfile?.name || 'U')),
        el('div', {}, [
          el('div', { class: 'font-semibold' }, currentUserProfile?.name),
          el('div', { class: 'text-sm text-blue-800' }, [
            el('strong', {}, 'Tu rol: '),
            currentUserProfile?.rol === 'admin' ? 'Administrador' : 'Miembro'
          ])
        ])
      ])
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

    return el('div', { class: 'flex gap-2 overflow-x-auto pb-2 mb-6' }, [
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

  function renderEmptyState() {
    return el('div', { class: 'text-center p-8 bg-gray-50 rounded-lg' }, [
      el('div', { class: 'text-6xl mb-4' }, '👥'),
      el('h3', { class: 'text-xl font-bold mb-2' }, 'No hay miembros en el equipo'),
      el('p', { class: 'text-gray-600' }, 'Esto no debería suceder. Contacta soporte.')
    ]);
  }

  function renderForm() {
    return el('div', { class: 'bg-gray-50 p-4 sm:p-6 rounded-lg mb-6 border' }, [
      el('h2', { class: 'text-xl font-bold mb-4' }, 'Editar Perfil'),
      el('form', {
        class: 'max-w-lg',
        onsubmit: (e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.target));
        }
      }, [
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
        el('div', { class: 'flex flex-col sm:flex-row gap-3' }, [
          el('button', {
            type: 'submit',
            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
          }, 'Actualizar'),
          el('button', {
            type: 'button',
            class: 'px-6 py-2 border rounded bg-white',
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

  function renderDetailsList(items) {
    return el('div', { class: 'space-y-2' }, items.map(perfil =>
      el('details', {
        class: `bg-white border rounded-lg ${perfil.id === currentUser.id ? 'border-blue-300 bg-blue-50' : ''}`
      }, [
        el('summary', {
          class: 'p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-3'
        }, [
          perfil.avatar
            ? el('img', {
                src: perfil.avatar,
                alt: perfil.name,
                class: 'w-12 h-12 rounded-full object-cover flex-shrink-0',
                onerror: (e) => {
                  e.target.outerHTML = `<div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">${getInitials(perfil.name)}</div>`;
                }
              })
            : el('div', {
                class: 'w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600 flex-shrink-0'
              }, getInitials(perfil.name)),
          el('div', { class: 'flex-1' }, [
            el('div', { class: 'font-bold text-lg' }, [
              perfil.name,
              perfil.id === currentUser.id ? el('span', { class: 'text-sm text-blue-600 ml-2' }, '(Tú)') : null
            ].filter(Boolean)),
            el('div', {}, [
              el('span', {
                class: `px-2 py-1 rounded text-xs font-semibold ${
                  perfil.rol === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`
              }, perfil.rol === 'admin' ? 'Administrador' : 'Miembro')
            ])
          ]),
          el('span', { class: 'text-gray-400 text-xl' }, '▼')
        ]),
        el('div', { class: 'p-4 pt-0 border-t space-y-3' }, [
          el('div', { class: 'text-xs text-gray-500' }, [
            'Miembro desde: ',
            new Date(perfil.created_at).toLocaleDateString('es-AR')
          ]),
          el('div', { class: 'flex flex-col gap-2 pt-2 border-t' }, [
            (isAdmin() || perfil.id === currentUser.id) ?
              el('button', {
                class: 'w-full bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',
                onclick: () => handleEdit(perfil)
              }, 'Editar Perfil') : null,
            isAdmin() && perfil.id !== currentUser.id ?
              el('button', {
                class: 'w-full bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded font-semibold',
                onclick: () => handleChangeRole(
                  perfil.id,
                  perfil.rol === 'admin' ? 'miembro' : 'admin'
                )
              }, perfil.rol === 'admin' ? 'Quitar Admin' : 'Hacer Admin') : null,
            isAdmin() && perfil.id !== currentUser.id ?
              el('button', {
                class: 'w-full bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',
                onclick: () => handleRemoveFromGroup(perfil.id)
              }, 'Eliminar del Grupo') : null
          ].filter(Boolean))
        ])
      ])
    ));
  }

  function renderCardsGrid(items) {
    return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, items.map(perfil =>
      el('div', {
        class: `bg-white p-4 rounded-lg border ${perfil.id === currentUser.id ? 'border-blue-300 bg-blue-50' : ''}`
      }, [
        el('div', { class: 'flex items-center gap-3 mb-3' }, [
          perfil.avatar
            ? el('img', {
                src: perfil.avatar,
                alt: perfil.name,
                class: 'w-16 h-16 rounded-full object-cover',
                onerror: (e) => {
                  e.target.outerHTML = `<div class="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">${getInitials(perfil.name)}</div>`;
                }
              })
            : el('div', {
                class: 'w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600'
              }, getInitials(perfil.name)),
          el('div', { class: 'flex-1' }, [
            el('h3', { class: 'text-lg font-bold' }, [
              perfil.name,
              perfil.id === currentUser.id ? el('span', { class: 'text-sm text-blue-600 ml-1' }, '(Tú)') : null
            ].filter(Boolean)),
            el('span', {
              class: `px-2 py-1 rounded text-xs font-semibold ${
                perfil.rol === 'admin'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`
            }, perfil.rol === 'admin' ? 'Admin' : 'Miembro')
          ])
        ]),
        el('div', { class: 'flex flex-col gap-2 pt-3 border-t' }, [
          (isAdmin() || perfil.id === currentUser.id) ?
            el('button', {
              class: 'w-full bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',
              onclick: () => handleEdit(perfil)
            }, 'Editar') : null,
          isAdmin() && perfil.id !== currentUser.id ?
            el('button', {
              class: 'w-full bg-white text-blue-600 border border-blue-600 px-3 py-2 rounded font-semibold text-sm',
              onclick: () => handleChangeRole(perfil.id, perfil.rol === 'admin' ? 'miembro' : 'admin')
            }, perfil.rol === 'admin' ? 'Quitar Admin' : 'Hacer Admin') : null,
          isAdmin() && perfil.id !== currentUser.id ?
            el('button', {
              class: 'w-full bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',
              onclick: () => handleRemoveFromGroup(perfil.id)
            }, 'Eliminar') : null
        ].filter(Boolean))
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
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Avatar'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Nombre'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Rol'),
                el('th', { class: 'px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider' }, 'Acciones')
              ])
            ]),
            el('tbody', { class: 'bg-white divide-y divide-gray-200' }, items.map(perfil =>
              el('tr', {
                class: `hover:bg-gray-50 ${perfil.id === currentUser.id ? 'bg-blue-50' : ''}`
              }, [
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  perfil.avatar
                    ? el('img', {
                        src: perfil.avatar,
                        alt: perfil.name,
                        class: 'w-12 h-12 rounded-full object-cover',
                        onerror: (e) => {
                          e.target.outerHTML = `<div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">${getInitials(perfil.name)}</div>`;
                        }
                      })
                    : el('div', {
                        class: 'w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600'
                      }, getInitials(perfil.name))
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('div', { class: 'font-semibold text-gray-900' }, perfil.name),
                  perfil.id === currentUser.id ?
                    el('span', { class: 'text-xs text-blue-600' }, '(Tú)') : null
                ].filter(Boolean)),
                el('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                  el('span', {
                    class: `px-3 py-1 rounded-full text-xs font-semibold ${
                      perfil.rol === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`
                  }, perfil.rol === 'admin' ? 'Administrador' : 'Miembro')
                ]),
                el('td', { class: 'px-6 py-4 whitespace-nowrap text-sm' }, [
                  el('div', { class: 'flex flex-col gap-2' }, [
                    (isAdmin() || perfil.id === currentUser.id) ?
                      el('button', {
                        class: 'text-primary font-semibold hover:underline text-left',
                        onclick: () => handleEdit(perfil)
                      }, 'Editar') : null,
                    isAdmin() && perfil.id !== currentUser.id ?
                      el('button', {
                        class: 'text-blue-600 font-semibold hover:underline text-left',
                        onclick: () => handleChangeRole(perfil.id, perfil.rol === 'admin' ? 'miembro' : 'admin')
                      }, perfil.rol === 'admin' ? 'Quitar Admin' : 'Hacer Admin') : null,
                    isAdmin() && perfil.id !== currentUser.id ?
                      el('button', {
                        class: 'text-red-600 font-semibold hover:underline text-left',
                        onclick: () => handleRemoveFromGroup(perfil.id)
                      }, 'Eliminar') : null
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