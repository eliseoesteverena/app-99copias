// empresas.js
import {
    el,
    mount
} from '../mount.js';
import {
    supabase
} from '../config.js';

export async function renderEmpresas(container, params) {
    // 1. Estado local
    let empresas = [];
    let loading = true;
    let error = null;
    let editingEmpresa = null;
    let showForm = false;
    let currentView = 'cards';

    // 2. Inicialización
    await init();

    // 3. Funciones auxiliares
    async function init() {
        if (params?.id) {
            await loadEmpresas();
            const empresa = empresas.find(e => e.id === params.id);
            if (empresa) {
                editingEmpresa = empresa;
                showForm = true;
            }
        } else {
            await loadEmpresas();
        }
        render();
    }

    async function loadEmpresas() {
        try {
            loading = true;
            render();

            const {
                data: {
                    user
                }
            } = await supabase.auth.getUser();
            const {
                data: perfil
            } = await supabase
                .from('perfiles')
                .select('grupo_id')
                .eq('id', user.id)
                .single();

            const {
                data,
                error: err
            } = await supabase
                .from('empresas')
                .select('*')
                .eq('grupo_id', perfil.grupo_id)
                .order('nombre', {
                    ascending: true
                });

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
            let cuit = formData.get('cuit').replace(/[^0-9]/g, '');

            // Validar longitud
            if (cuit.length !== 11) {
                alert('El CUIT debe tener 11 dígitos');
                return;
            }

            // Validar dígito verificador
            if (!validarCUIT(cuit)) {
                alert('El CUIT ingresado no es válido (dígito verificador incorrecto)');
                return;
            }

            const empresaData = {
                nombre: formData.get('nombre'),
                razon_social: formData.get('razon_social'),
                cuit: cuit
            };

            const {
                data: {
                    user
                }
            } = await supabase.auth.getUser();
            const {
                data: perfil
            } = await supabase
                .from('perfiles')
                .select('grupo_id')
                .eq('id', user.id)
                .single();

            if (editingEmpresa) {
                const {
                    error: err
                } = await supabase
                    .from('empresas')
                    .update(empresaData)
                    .eq('id', editingEmpresa.id)
                    .eq('grupo_id', perfil.grupo_id);

                if (err) throw err;
            } else {
                const {
                    error: err
                } = await supabase
                    .from('empresas')
                    .insert({
                        ...empresaData,
                        grupo_id: perfil.grupo_id
                    });

                if (err) throw err;
            }

            closeModal();
            await loadEmpresas();
        } catch (err) {
            console.error('Error al guardar empresa:', err);
            alert('Error al guardar: ' + err.message);
        }
    }

    function validarCUIT(cuit) {
        if (cuit.length !== 11) return false;

        const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        let suma = 0;

        for (let i = 0; i < 10; i++) {
            suma += parseInt(cuit[i]) * multiplicadores[i];
        }

        const resto = suma % 11;
        const digitoVerificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

        return digitoVerificador === parseInt(cuit[10]);
    }

    async function handleDelete(empresaId) {
        if (!confirm('¿Estás seguro de eliminar esta empresa?')) return;

        try {
            const {
                error: err
            } = await supabase
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
        window.history.pushState({}, '', `#/empresas/${empresa.id}`);
        render();
    }

    function closeModal() {
        showForm = false;
        editingEmpresa = null;
        window.history.pushState({}, '', '#/empresas');
        render();
    }

    function formatCUIT(cuit) {
        if (cuit.includes('-')) return cuit;
        if (cuit.length === 11) {
            return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
        }
        return cuit;
    }

    function render() {
        container.innerHTML = '';

        if (loading) {
            mount(container, 'div', {
                class: 'flex items-center justify-center p-8'
            }, [
                el('div', {
                    class: 'text-gray-600'
                }, 'Cargando empresas...')
            ]);
            return;
        }

        if (error) {
            mount(container, 'div', {
                class: 'p-6'
            }, [
                el('div', {
                    class: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'
                }, error)
            ]);
            return;
        }

        mount(container, 'div', {
            class: 'container p-4 sm:p-6'
        }, [
            renderHeader(),
            renderSearchHint(),
            renderViewToggle(),

            empresas.length === 0 ?
            renderEmptyState() :
            el('div', {}, [
                currentView === 'details' ?
                renderDetailsList(empresas) :
                null,
                currentView === 'cards' ?
                renderCardsGrid(empresas) :
                null
            ].filter(Boolean))
        ].filter(Boolean));

        if (showForm) {
            mount(container, 'div', {}, [renderModal()]);
        }
    }

    function renderHeader() {
        return el('div', {
            class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'
        }, [
            el('h1', {
                class: 'text-2xl sm:text-3xl font-bold'
            }, 'Empresas'),
            el('button', {
                class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold',
                style: {
                    width: 'fit-content'
                },
                onclick: () => {
                    editingEmpresa = null;
                    showForm = true;
                    render();
                }
            }, '+ Nueva Empresa')
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

        return el('div', {
            class: 'flex gap-2 mb-6'
        }, [
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
        return el('div', {
            class: 'text-center p-8 bg-gray-50 rounded-lg'
        }, [
            el('div', {
                class: 'text-6xl mb-4'
            }, '🏢'),
            el('h3', {
                class: 'text-xl font-bold mb-2'
            }, 'No hay empresas registradas'),
            el('p', {
                class: 'text-gray-600 mb-4'
            }, 'Comienza agregando tu primera empresa'),
            el('button', {
                class: 'bg-primary text-white px-6 py-2 rounded font-semibold',
                style: {
                    width: 'fit-content'
                },
                onclick: () => {
                    showForm = true;
                    render();
                }
            }, '+ Crear Primera Empresa')
        ]);
    }

    function renderModal() {
    return el('div', {
                class: 'fixed inset-0 z-50 flex items-center justify-center p-4',
                style: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                el('div', {
                    class: 'flex justify-between items-center p-6 border-b'
                }, [
                    el('h2', {
                            class: 'text-xl font-bold'
                        },
                        editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'
                    ),
                    el('button', {
                        class: 'text-2xl text-gray-500 hover:text-gray-700',
                        onclick: closeModal
                    }, '×')
                ]),

                el('form', {
                    class: 'p-6',
                    onsubmit: (e) => {
                        e.preventDefault();
                        handleSubmit(new FormData(e.target));
                    }
                }, [
                    el('div', {
                        class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'
                    }, [
                        el('div', {}, [
                            el('label', {
                                class: 'block mb-2 font-semibold'
                            }, 'Nombre Comercial *'),
                            el('input', {
                                type: 'text',
                                name: 'nombre',
                                class: 'w-full p-2 border rounded',
                                required: true,
                                value: editingEmpresa?.nombre || ''
                            })
                        ]),

                        el('div', {}, [
                            el('label', {
                                class: 'block mb-2 font-semibold'
                            }, 'CUIT *'),
                            el('input', {
                                type: 'text',
                                name: 'cuit',
                                class: 'w-full p-2 border rounded',
                                required: true,
                                placeholder: '20-12345678-9 o 20123456789',
                                maxlength: 13,
                                value: editingEmpresa?.cuit || ''
                            })
                        ])
                    ]),

                    el('div', {
                        class: 'mb-6'
                    }, [
                        el('label', {
                            class: 'block mb-2 font-semibold'
                        }, 'Razón Social *'),
                        el('input', {
                            type: 'text',
                            name: 'razon_social',
                            class: 'w-full p-2 border rounded',
                            required: true,
                            value: editingEmpresa?.razon_social || ''
                        })
                    ]),

                    el('div', {
                        class: 'flex gap-3 justify-end'
                    }, [
                        el('button', {
                            type: 'button',
                            class: 'px-6 py-2 border rounded bg-white',
                            onclick: closeModal
                        }, 'Cancelar'),
                        el('button', {
                            type: 'submit',
                            class: 'bg-primary text-white px-6 py-2 rounded font-semibold'
                        }, editingEmpresa ? 'Actualizar' : 'Guardar')
                    ])
                ])
            ])
        ]);
    }

    function renderDetailsList(items) {
        return el('div', {
            class: 'space-y-3'
        }, items.map(empresa =>
            el('details', {
                class: 'bg-white border rounded-lg'
            }, [
                el('summary', {
                    class: 'p-4 cursor-pointer hover:bg-gray-50 font-semibold flex justify-between items-center'
                }, [
                    el('div', {
                        class: 'flex-1'
                    }, [
                        el('div', {
                            class: 'font-bold text-lg'
                        }, empresa.nombre),
                        el('div', {
                            class: 'text-sm text-gray-600'
                        }, `🏦 CUIT: ${formatCUIT(empresa.cuit)}`)
                    ]),
                    el('span', {
                        class: 'text-gray-400'
                    }, '▼')
                ]),

                el('div', {
                    class: 'p-4 pt-0 border-t space-y-3'
                }, [
                    el('div', {}, [
                        el('div', {
                            class: 'text-sm font-semibold text-gray-700 mb-1'
                        }, 'Razón Social'),
                        el('div', {}, empresa.razon_social)
                    ]),

                    el('div', {}, [
                        el('div', {
                            class: 'text-sm font-semibold text-gray-700 mb-1'
                        }, 'CUIT Completo'),
                        el('div', {
                            class: 'font-mono'
                        }, formatCUIT(empresa.cuit))
                    ]),

                    el('div', {
                        class: 'text-xs text-gray-500'
                    }, [
                        'Creada: ',
                        new Date(empresa.created_at).toLocaleDateString('es-AR')
                    ]),

                    el('div', {
                        class: 'flex gap-2 pt-2 border-t'
                    }, [
                        el('button', {
                            class: 'flex-1 bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',
                            onclick: () => handleEdit(empresa)
                        }, 'Editar'),
                        el('button', {
                            class: 'flex-1 bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',
                            onclick: () => handleDelete(empresa.id)
                        }, 'Eliminar')
                    ])
                ])
            ])
        ));
    }

    function renderCardsGrid(items) {
  return el('div', {class: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'},
    items.map(empresa =>
      el('div', {class: 'bg-white p-4 rounded-lg border flex flex-col justify-between'}, [
        el('div', {class: 'mb-3'}, [
          el('h3', {class: 'text-lg font-bold mb-1'}, empresa.nombre),
          el('p', {class: 'text-sm text-gray-600 mb-1'}, empresa.razon_social),
          el('p', {class: 'text-sm text-gray-600 font-mono'}, `CUIT: ${formatCUIT(empresa.cuit)}`)
        ]),
        el('div', {class: 'flex gap-2 pt-3 border-t'}, [
          el('button', {
            class: 'flex-1 bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleEdit(empresa)
          }, 'Editar'),
          el('button', {
            class: 'flex-1 bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',
            onclick: () => handleDelete(empresa.id)
          }, 'Eliminar')
        ])
      ])
    )
  );
}
}