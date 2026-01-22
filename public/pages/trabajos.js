import { el, mount } from '../mount.js';
import { supabase } from '../config.js';
export async function renderTrabajos(container, params) {
let trabajos = [];
let clientes = [];
let empresas = [];
let loading = true;
let error = null;
let editingTrabajo = null;
let filterEstado = '';
let filterPrioridad = '';
let showFilters = false;
let currentView = 'cards';
let clienteSearchTerm = '';
let showClienteResults = false;
let selectedClienteIndex = -1;
let selectedCliente = null;
let selectedEmpresa = null;
let showClienteModal = false;
let currentClienteModalTab = 'personal';
const ESTADOS = ['Presupuesto', 'Aprobado', 'En Curso', 'Pausado', 'Completado', 'Cancelado', 'Archivado'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];
await init();
async function init() {
await Promise.all([loadTrabajos(), loadClientes(), loadEmpresas()]);
if (params?.id) {
const trabajo = trabajos.find(t => t.id === params.id);
if (trabajo) handleEdit(trabajo);
}
render();
}
async function loadTrabajos() {
try {
loading = true;
render();
const { data: { user } } = await supabase.auth.getUser();
const { data: perfil } = await supabase.from('perfiles').select('grupo_id').eq('id', user.id).single();
const { data, error: err } = await supabase.from('trabajos').select(`*,cliente:clientes(id, nombre, apellido, email, telefono),empresa:empresas(id, nombre),creador:perfiles!trabajos_created_user_id_fkey(id, name)`).eq('grupo_id', perfil.grupo_id).order('fecha_entrega', { ascending: true, nullsFirst: false });
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
const { data: perfil } = await supabase.from('perfiles').select('grupo_id').eq('id', user.id).single();
const { data, error: err } = await supabase.from('clientes').select('id, nombre, apellido, email, telefono').eq('grupo_id', perfil.grupo_id).order('nombre');
if (err) throw err;
clientes = data || [];
} catch (err) {
console.error('Error al cargar clientes:', err);
}
}
async function loadEmpresas() {
try {
const { data: { user } } = await supabase.auth.getUser();
const { data: perfil } = await supabase.from('perfiles').select('grupo_id').eq('id', user.id).single();
const { data, error: err } = await supabase.from('empresas').select('id, nombre, razon_social, cuit').eq('grupo_id', perfil.grupo_id).order('nombre');
if (err) throw err;
empresas = data || [];
} catch (err) {
console.error('Error al cargar empresas:', err);
}
}
async function handleSubmit(formData) {
try {
if (!selectedCliente) {
alert('Debe seleccionar un cliente');
return;
}
const trabajoData = {
cliente_id: selectedCliente.id,
empresa_id: selectedEmpresa?.id || null,
detalles: formData.get('detalles'),
presupuesto: parseFloat(formData.get('presupuesto')) || 0,
monto_pagado: parseFloat(formData.get('monto_pagado')) || 0,
estado: formData.get('estado'),
prioridad: formData.get('prioridad'),
fecha_entrega: formData.get('fecha_entrega') || null
};
const { data: { user } } = await supabase.auth.getUser();
const { data: perfil } = await supabase.from('perfiles').select('grupo_id').eq('id', user.id).single();
if (editingTrabajo) {
const { error: err } = await supabase.from('trabajos').update(trabajoData).eq('id', editingTrabajo.id).eq('grupo_id', perfil.grupo_id);
if (err) throw err;
} else {
const { error: err } = await supabase.from('trabajos').insert({...trabajoData, grupo_id: perfil.grupo_id, created_user_id: user.id});
if (err) throw err;
}
if (selectedEmpresa) {
await createClienteEmpresaRelation(selectedCliente.id, selectedEmpresa.id);
}
closeSidebar();
await loadTrabajos();
} catch (err) {
console.error('Error al guardar trabajo:', err);
alert('Error al guardar: ' + err.message);
}
}
async function createClienteEmpresaRelation(clienteId, empresaId) {
try {
const { data: existing } = await supabase.from('cliente_empresa').select('*').eq('cliente_id', clienteId).eq('empresa_id', empresaId).single();
if (!existing) {
const { error: err } = await supabase.from('cliente_empresa').insert({cliente_id: clienteId, empresa_id: empresaId});
if (err) throw err;
}
} catch (err) {
console.error('Error al crear relación cliente-empresa:', err);
}
}
async function handleDelete(trabajoId) {
if (!confirm('¿Estás seguro de eliminar este trabajo?')) return;
try {
const { error: err } = await supabase.from('trabajos').delete().eq('id', trabajoId);
if (err) throw err;
await loadTrabajos();
} catch (err) {
console.error('Error al eliminar:', err);
alert('Error al eliminar: ' + err.message);
}
}
function handleEdit(trabajo) {
editingTrabajo = trabajo;
selectedCliente = trabajo.cliente;
selectedEmpresa = trabajo.empresa || null;
clienteSearchTerm = getFullClienteName(trabajo.cliente);
window.history.pushState({}, '', `#/trabajos/${trabajo.id}`);
openFormSidebar();
}
function handleNew() {
editingTrabajo = null;
selectedCliente = null;
selectedEmpresa = null;
clienteSearchTerm = '';
openFormSidebar();
}
function openFormSidebar() {
const title = editingTrabajo ? 'Editar Trabajo' : 'Nuevo Trabajo';
const content = showClienteModal ? renderClienteModal() : renderFormulario();
document.dispatchEvent(new CustomEvent('formSidebar:open', {detail: { title, content }}));
}
function closeSidebar() {
editingTrabajo = null;
selectedCliente = null;
selectedEmpresa = null;
clienteSearchTerm = '';
showClienteResults = false;
showClienteModal = false;
currentClienteModalTab = 'personal';
window.location.hash = '#/trabajos';
document.dispatchEvent(new CustomEvent('formSidebar:close'));
}
function getFilteredTrabajos() {
return trabajos.filter(t => {
const matchEstado = !filterEstado || t.estado === filterEstado;
const matchPrioridad = !filterPrioridad || t.prioridad === filterPrioridad;
return matchEstado && matchPrioridad;
});
}
function getClienteName(trabajo) {
if (!trabajo.cliente) return 'Sin cliente';
const { nombre, apellido } = trabajo.cliente;
return apellido ? `${nombre} ${apellido}` : nombre;
}
function getClienteContact(cliente) {
if (!cliente) return '';
if (cliente.telefono) return cliente.telefono;
if (cliente.email) return cliente.email;
return '';
}
function getFullClienteName(cliente) {
return cliente.apellido ? `${cliente.nombre} ${cliente.apellido}` : cliente.nombre;
}
function getEstadoBadgeClass(estado) {
const classes = {'Presupuesto': 'bg-gray-100 text-gray-800','Aprobado': 'bg-blue-100 text-blue-800','En Curso': 'bg-yellow-100 text-yellow-800','Pausado': 'bg-orange-100 text-orange-800','Completado': 'bg-green-100 text-green-800','Cancelado': 'bg-red-100 text-red-800','Archivado': 'bg-gray-300 text-gray-700'};
return classes[estado] || 'bg-gray-100 text-gray-800';
}
function getPrioridadBadgeClass(prioridad) {
const classes = {'Baja': 'bg-green-50 text-green-700','Media': 'bg-blue-50 text-blue-700','Alta': 'bg-orange-50 text-orange-700','Urgente': 'bg-red-50 text-red-700'};
return classes[prioridad] || 'bg-gray-50 text-gray-700';
}
function formatCurrency(amount) {
return new Intl.NumberFormat('es-AR', {style: 'currency',currency: 'ARS'}).format(amount);
}
function formatDate(dateString) {
if (!dateString) return '-';
return new Date(dateString).toLocaleDateString('es-AR');
}
function capitalizeWords(str) {
return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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
function handleClienteSearch(value) {
clienteSearchTerm = value;
selectedClienteIndex = -1;
showClienteResults = value.length >= 3;
updateFormContent();
}
function getFilteredClientes() {
if (clienteSearchTerm.length < 3) return [];
const term = clienteSearchTerm.toLowerCase();
return clientes.filter(c => {
const fullName = getFullClienteName(c).toLowerCase();
return fullName.includes(term) || c.email.toLowerCase().includes(term);
});
}
function handleClienteKeyDown(e) {
const filtered = getFilteredClientes();
if (e.key === 'ArrowDown') {
e.preventDefault();
selectedClienteIndex = Math.min(selectedClienteIndex + 1, filtered.length);
updateFormContent();
} else if (e.key === 'ArrowUp') {
e.preventDefault();
selectedClienteIndex = Math.max(selectedClienteIndex - 1, -1);
updateFormContent();
} else if (e.key === 'Enter') {
e.preventDefault();
if (selectedClienteIndex === filtered.length) {
openClienteModal();
} else if (selectedClienteIndex >= 0) {
selectCliente(filtered[selectedClienteIndex]);
}
} else if (e.key === 'Escape') {
showClienteResults = false;
updateFormContent();
}
}
function selectCliente(cliente) {
selectedCliente = cliente;
clienteSearchTerm = getFullClienteName(cliente);
showClienteResults = false;
updateFormContent();
}
function openClienteModal() {
showClienteModal = true;
showClienteResults = false;
currentClienteModalTab = 'personal';
updateFormContent();
}
function closeClienteModal() {
showClienteModal = false;
updateFormContent();
}
function openEditClienteModal() {
if (!selectedCliente) return;
showClienteModal = true;
currentClienteModalTab = 'personal';
updateFormContent();
}
async function handleClienteModalSubmit(formData) {
try {
const nombre = formData.get('cliente_nombre');
const apellido = formData.get('cliente_apellido') || null;
const email = formData.get('cliente_email');
const telefono = formData.get('cliente_telefono') || null;
const empresaNombre = formData.get('empresa_nombre') || null;
const empresaRazonSocial = formData.get('empresa_razon_social') || null;
const empresaCuit = formData.get('empresa_cuit') || null;
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
if (!emailRegex.test(email)) {
alert('El formato del email no es válido');
return;
}
const { data: { user } } = await supabase.auth.getUser();
const { data: perfil } = await supabase.from('perfiles').select('grupo_id').eq('id', user.id).single();
if (empresaNombre && empresaRazonSocial && empresaCuit) {
let cuit = empresaCuit.replace(/[^0-9]/g, '');
if (cuit.length !== 11) {
alert('El CUIT debe tener 11 dígitos');
return;
}
if (!validarCUIT(cuit)) {
alert('El CUIT ingresado no es válido');
return;
}
const { data: newEmpresa, error: errEmpresa } = await supabase.from('empresas').insert({nombre: empresaNombre, razon_social: empresaRazonSocial, cuit: cuit, grupo_id: perfil.grupo_id}).select().single();
if (errEmpresa) throw errEmpresa;
selectedEmpresa = newEmpresa;
await loadEmpresas();
}
const clienteData = {nombre, apellido, email, telefono};
if (selectedCliente?.id) {
const { error: err } = await supabase.from('clientes').update(clienteData).eq('id', selectedCliente.id).eq('grupo_id', perfil.grupo_id);
if (err) throw err;
await loadClientes();
selectedCliente = clientes.find(c => c.id === selectedCliente.id);
} else {
const { data: newCliente, error: err } = await supabase.from('clientes').insert({...clienteData, grupo_id: perfil.grupo_id}).select().single();
if (err) throw err;
await loadClientes();
selectedCliente = newCliente;
}
if (selectedEmpresa) {
await createClienteEmpresaRelation(selectedCliente.id, selectedEmpresa.id);
}
clienteSearchTerm = getFullClienteName(selectedCliente);
showClienteModal = false;
updateFormContent();
} catch (err) {
console.error('Error al guardar cliente:', err);
alert('Error al guardar cliente: ' + err.message);
}
}
function updateFormContent() {
const content = showClienteModal ? renderClienteModal() : renderFormulario();
document.dispatchEvent(new CustomEvent('formSidebar:open', {detail: {title: editingTrabajo ? 'Editar Trabajo' : 'Nuevo Trabajo', content}}));
}
function renderFormulario() {
return el('form', {onsubmit: (e) => {e.preventDefault();handleSubmit(new FormData(e.target));}}, [renderClienteAutocomplete(),el('div', { class: 'mb-4' }, [el('label', { class: 'block mb-2 font-semibold' }, 'Detalles del Trabajo *'),el('textarea', {name: 'detalles',class: 'w-full p-2 border rounded',rows: 4,required: true,placeholder: 'Describe el trabajo a realizar...'}, editingTrabajo?.detalles || '')]),el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' }, [el('div', {}, [el('label', { class: 'block mb-2 font-semibold' }, 'Presupuesto *'),el('input', {type: 'number',name: 'presupuesto',class: 'w-full p-2 border rounded',step: '0.01',min: '0',required: true,value: editingTrabajo?.presupuesto || ''})]),el('div', {}, [el('label', { class: 'block mb-2 font-semibold' }, 'Monto Pagado'),el('input', {type: 'number',name: 'monto_pagado',class: 'w-full p-2 border rounded',step: '0.01',min: '0',value: editingTrabajo?.monto_pagado || '0'})]),el('div', {}, [el('label', { class: 'block mb-2 font-semibold' }, 'Fecha de Entrega'),el('input', {type: 'date',name: 'fecha_entrega',class: 'w-full p-2 border rounded',value: editingTrabajo?.fecha_entrega?.split('T')[0] || ''})])]),el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6' }, [el('div', {}, [el('label', { class: 'block mb-2 font-semibold' }, 'Estado *'),el('select', {name: 'estado',class: 'w-full p-2 border rounded',required: true}, ESTADOS.map(estado =>el('option', {value: estado,selected: editingTrabajo?.estado === estado || (!editingTrabajo && estado === 'Presupuesto')}, estado)))]),el('div', {}, [el('label', { class: 'block mb-2 font-semibold' }, 'Prioridad *'),el('select', {name: 'prioridad',class: 'w-full p-2 border rounded',required: true}, PRIORIDADES.map(prioridad =>el('option', {value: prioridad,selected: editingTrabajo?.prioridad === prioridad || (!editingTrabajo && prioridad === 'Media')}, prioridad)))])]),el('div', { class: 'flex gap-3 justify-end' }, [el('button', {type: 'button',class: 'px-6 py-2 border rounded bg-white',onclick: closeSidebar}, 'Cancelar'),el('button', {type: 'submit',class: 'bg-primary text-white px-6 py-2 rounded font-semibold'}, editingTrabajo ? 'Actualizar' : 'Guardar')])]);
}
function renderClienteAutocomplete() {
const filteredClientes = getFilteredClientes();
return el('div', { class: 'mb-4' }, [el('label', { class: 'block mb-2 font-semibold' }, 'Cliente *'),selectedCliente ? el('div', {class: 'p-3 bg-green-50 border border-green-200 rounded'}, [el('div', { class: 'flex justify-between items-start' }, [el('div', { class: 'flex-1' }, [el('div', { class: 'font-semibold text-green-800' }, getFullClienteName(selectedCliente)),selectedCliente.email ? el('div', { class: 'text-sm text-gray-600' }, selectedCliente.email) : null,selectedCliente.telefono ? el('div', { class: 'text-sm text-gray-600' }, selectedCliente.telefono) : null].filter(Boolean)),el('div', { class: 'flex gap-2' }, [el('button', {type: 'button',class: 'text-blue-600 hover:text-blue-800',onclick: openEditClienteModal,title: 'Editar cliente','aria-label': 'Editar cliente'}, '✏️'),el('button', {type: 'button',class: 'text-red-600 hover:text-red-800 text-xl',onclick: () => {selectedCliente = null;clienteSearchTerm = '';updateFormContent();},title: 'Quitar cliente','aria-label': 'Quitar cliente'}, '×')])])]) : el('div', { class: 'relative' }, [el('input', {type: 'text',class: 'w-full p-2 border rounded',placeholder: 'Buscar cliente (min. 3 caracteres)...',value: clienteSearchTerm,oninput: (e) => handleClienteSearch(e.target.value),onkeydown: (e) => handleClienteKeyDown(e),onfocus: () => {if (clienteSearchTerm.length >= 3) {showClienteResults = true;updateFormContent();}},'aria-label': 'Buscar cliente','aria-expanded': showClienteResults,'aria-autocomplete': 'list'}),showClienteResults && filteredClientes.length > 0 ? el('div', {class: 'absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto',role: 'listbox'}, [...filteredClientes.map((cliente, index) =>el('div', {class: `p-3 cursor-pointer hover:bg-gray-50 ${index === selectedClienteIndex ? 'bg-blue-50' : ''}`,role: 'option',tabindex: 0,'aria-selected': index === selectedClienteIndex,onclick: () => selectCliente(cliente),onkeydown: (e) => {if (e.key === 'Enter') selectCliente(cliente);}}, [el('div', { class: 'font-semibold' }, getFullClienteName(cliente)),el('div', { class: 'text-sm text-gray-600' }, cliente.email)])),el('div', {class: `p-3 cursor-pointer border-t bg-gray-50 hover:bg-gray-100 ${selectedClienteIndex === filteredClientes.length ? 'bg-blue-50' : ''}`,role: 'option',tabindex: 0,'aria-selected': selectedClienteIndex === filteredClientes.length,onclick: openClienteModal,onkeydown: (e) => {if (e.key === 'Enter') openClienteModal();}}, [el('div', { class: 'font-semibold text-primary' }, '+ Agregar nuevo cliente'),el('div', { class: 'text-sm text-gray-600' }, `"${clienteSearchTerm}"`)])]) : null,showClienteResults && clienteSearchTerm.length >= 3 && filteredClientes.length === 0 ? el('div', {class: 'absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg',role: 'listbox'}, [el('div', {class: 'p-3 cursor-pointer bg-gray-50 hover:bg-gray-100',role: 'option',tabindex: 0,onclick: openClienteModal,onkeydown: (e) => {if (e.key === 'Enter') openClienteModal();}}, [el('div', { class: 'font-semibold text-primary' }, '+ Agregar nuevo cliente'),el('div', { class: 'text-sm text-gray-600' }, `"${clienteSearchTerm}"`)])]) : null])]);
}
function renderClienteModal() {
const words = clienteSearchTerm.trim().split(' ');
const nombreDefault = selectedCliente ? selectedCliente.nombre : capitalizeWords(words[0] || '');
const apellidoDefault = selectedCliente ? (selectedCliente.apellido || '') : (words.length > 1 ? capitalizeWords(words.slice(1).join(' ')) : '');
return el('div', { class: 'p-4' }, [el('div', { class: 'flex justify-between items-center mb-4' }, [el('h3', { class: 'text-lg font-bold' }, selectedCliente ? 'Editar Cliente' : 'Agregar Cliente'),el('button', {type: 'button',class: 'text-2xl text-gray-500 hover:text-gray-700',onclick: closeClienteModal,'aria-label': 'Cerrar modal'}, '×')]),el('div', { class: 'flex gap-2 mb-4 border-b' }, [el('button', {type: 'button',class: `px-4 py-2 ${currentClienteModalTab === 'personal' ? 'border-b-2 border-primary font-semibold' : 'text-gray-600'}`,onclick: () => {currentClienteModalTab = 'personal';updateFormContent();}}, 'Datos Personales'),el('button', {type: 'button',class: `px-4 py-2 ${currentClienteModalTab === 'empresa' ? 'border-b-2 border-primary font-semibold' : 'text-gray-600'}`,onclick: () => {currentClienteModalTab = 'empresa';updateFormContent();}}, 'Empresa')]),el('form', {onsubmit: (e) => {e.preventDefault();handleClienteModalSubmit(new FormData(e.target));}}, [currentClienteModalTab === 'personal' ? el('div', {}, [el('div', { class: 'grid grid-cols-2 gap-4 mb-4' }, [el('div', {}, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Nombre *'),el('input', {type: 'text',name: 'cliente_nombre',class: 'w-full p-2 border rounded',required: true,value: nombreDefault})]),el('div', {}, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Apellido'),el('input', {type: 'text',name: 'cliente_apellido',class: 'w-full p-2 border rounded',value: apellidoDefault})])]),el('div', { class: 'mb-4' }, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Email *'),el('input', {type: 'email',name: 'cliente_email',class: 'w-full p-2 border rounded',required: true,placeholder: 'ejemplo@correo.com',value: selectedCliente?.email || ''})]),el('div', { class: 'mb-6' }, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Teléfono'),el('input', {type: 'tel',name: 'cliente_telefono',class: 'w-full p-2 border rounded',placeholder: '+54 11 1234-5678',value: selectedCliente?.telefono || ''})])]) : null,currentClienteModalTab === 'empresa' ? el('div', {}, [el('div', { class: 'mb-4' }, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Nombre Comercial'),el('input', {type: 'text',name: 'empresa_nombre',class: 'w-full p-2 border rounded'})]),el('div', { class: 'mb-4' }, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Razón Social'),el('input', {type: 'text',name: 'empresa_razon_social',class: 'w-full p-2 border rounded'})]),el('div', { class: 'mb-6' }, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'CUIT'),el('input', {type: 'text',name: 'empresa_cuit',class: 'w-full p-2 border rounded',placeholder: '20-12345678-9 o 20123456789',maxlength: 13})])]) : null,el('div', { class: 'flex gap-3 justify-end' }, [el('button', {type: 'button',class: 'px-4 py-2 border rounded bg-white',onclick: closeClienteModal}, 'Cancelar'),el('button', {type: 'submit',class: 'bg-primary text-white px-4 py-2 rounded font-semibold'}, selectedCliente ? 'Actualizar' : 'Crear Cliente')])].filter(Boolean))]);
}
function render() {
container.innerHTML = '';
if (loading) {
mount(container, 'div', { class: 'flex items-center justify-center p-8' }, [el('div', { class: 'text-gray-600' }, 'Cargando trabajos...')]);
return;
}
if (error) {
mount(container, 'div', { class: 'p-6' }, [el('div', {class: 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'}, error)]);
return;
}
const filteredTrabajos = getFilteredTrabajos();
mount(container, 'div', { class: 'container p-4 sm:p-6' }, [renderHeader(),renderSearchAndControls(),filteredTrabajos.length === 0 ? renderEmptyState() : el('div', {}, [currentView === 'details' ? renderDetailsList(filteredTrabajos) : null,currentView === 'cards' ? renderCardsGrid(filteredTrabajos) : null].filter(Boolean))].filter(Boolean));
}
function renderHeader() {
return el('div', {class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'}, [el('h1', { class: 'text-2xl sm:text-3xl font-bold' }, 'Trabajos'),el('button', {class: 'bg-primary text-white px-4 sm:px-6 py-2 rounded font-semibold',style: { width: 'fit-content' },onclick: handleNew}, '+ Nuevo Trabajo')]);
}
function renderSearchAndControls() {
return el('div', { class: 'mb-6 space-y-4' }, [el('div', { class: 'flex gap-2' }, [renderViewToggle(),el('div', {class: 'hidden sm:block',style: { width: '1px', backgroundColor: '#e5e7eb', margin: '0 0.5rem' }}),el('button', {class: 'px-4 py-2 border rounded bg-white font-semibold',onclick: () => {showFilters = !showFilters;render();}}, `⚙️ Filtros${(filterEstado || filterPrioridad) ? ' ●' : ''}`)]),showFilters ? renderFiltersPanel() : null].filter(Boolean));
}
function renderViewToggle() {
const buttonClass = (view) => {
const isActive = currentView === view;
return `px-4 py-2 rounded font-semibold ${isActive ? 'bg-primary text-white' : 'bg-white text-gray-700 border border-gray-300'}`;
};
return el('div', { class: 'flex gap-2' }, [el('button', {class: buttonClass('cards'),onclick: () => {currentView = 'cards';render();}}, '🎴 Cards'),el('button', {class: buttonClass('details'),onclick: () => {currentView = 'details';render();}}, '📋 Lista')]);
}
function renderFiltersPanel() {
return el('div', { class: 'bg-gray-50 border rounded-lg p-4' }, [el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4' }, [el('div', {}, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Estado'),el('select', {class: 'w-full p-2 border rounded',value: filterEstado,onchange: (e) => {filterEstado = e.target.value;render();}}, [el('option', { value: '' }, 'Todos'),...ESTADOS.map(estado =>el('option', { value: estado }, estado))])]),el('div', {}, [el('label', { class: 'block mb-2 font-semibold text-sm' }, 'Prioridad'),el('select', {class: 'w-full p-2 border rounded',value: filterPrioridad,onchange: (e) => {filterPrioridad = e.target.value;render();}}, [el('option', { value: '' }, 'Todas'),...PRIORIDADES.map(prioridad =>el('option', { value: prioridad }, prioridad))])]),el('div', { class: 'flex items-end' }, [el('button', {class: 'w-full px-4 py-2 border rounded bg-white',onclick: () => {filterEstado = '';filterPrioridad = '';render();}}, 'Limpiar Filtros')])])]);
}
function renderEmptyState() {
return el('div', { class: 'text-center p-8 bg-gray-50 rounded-lg' }, [el('div', { class: 'text-6xl mb-4' }, '📋'),el('h3', { class: 'text-xl font-bold mb-2' },(filterEstado || filterPrioridad) ? 'No hay trabajos con estos filtros' : 'No hay trabajos registrados'),el('p', { class: 'text-gray-600 mb-4' },(filterEstado || filterPrioridad) ? 'Intenta ajustando los filtros' : 'Comienza agregando tu primer trabajo'),!(filterEstado || filterPrioridad) ? el('button', {class: 'bg-primary text-white px-6 py-2 rounded font-semibold',style: { width: 'fit-content' },onclick: handleNew}, '+ Crear Primer Trabajo') : null].filter(Boolean));
}
function renderDetailsList(items) {
return el('div', { class: 'space-y-3' }, items.map(trabajo => {
const contacto = getClienteContact(trabajo.cliente);
return el('details', { class: 'bg-white border rounded-lg' }, [el('summary', {class: 'p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-start gap-2'}, [el('div', { class: 'flex-1' }, [el('div', { class: 'font-bold text-lg mb-1' }, getClienteName(trabajo)),contacto ? el('div', { class: 'text-sm text-gray-600 mb-1' }, contacto) : null,el('div', { class: 'flex flex-wrap gap-2 mb-1' }, [el('span', {class: `px-2 py-1 rounded text-xs font-semibold ${getEstadoBadgeClass(trabajo.estado)}`}, trabajo.estado),el('span', {class: `px-2 py-1 rounded text-xs font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`}, trabajo.prioridad)]),el('div', { class: 'text-sm font-semibold text-green-700' }, formatCurrency(trabajo.presupuesto))].filter(Boolean)),el('span', { class: 'text-gray-400 text-xl' }, '▼')]),el('div', { class: 'p-4 pt-0 border-t space-y-3' }, [trabajo.empresa ? el('div', {}, [el('div', { class: 'text-sm font-semibold text-gray-700' }, '🏢 Empresa'),el('div', {}, trabajo.empresa.nombre)]) : null,el('div', {}, [el('div', { class: 'text-sm font-semibold text-gray-700 mb-1' }, 'Detalles'),el('div', { class: 'text-sm' }, trabajo.detalles)]),el('div', { class: 'grid grid-cols-2 gap-2 text-sm' }, [el('div', {}, [el('div', { class: 'text-gray-600' }, 'Pagado'),el('div', { class: 'font-semibold' }, formatCurrency(trabajo.monto_pagado))]),el('div', {}, [el('div', { class: 'text-gray-600' }, 'Entrega'),el('div', { class: 'font-semibold' }, formatDate(trabajo.fecha_entrega))])]),trabajo.creador ? el('div', { class: 'text-xs text-gray-500' },`Creado por: ${trabajo.creador.name}`) : null,el('div', { class: 'flex gap-2 pt-2 border-t' }, [el('button', {class: 'flex-1 bg-white text-primary border border-primary px-4 py-2 rounded font-semibold',onclick: () => handleEdit(trabajo)}, 'Editar'),el('button', {class: 'flex-1 bg-white text-red-600 border border-red-600 px-4 py-2 rounded font-semibold',onclick: () => handleDelete(trabajo.id)}, 'Eliminar')])].filter(Boolean))]);
}));
}
function renderCardsGrid(items) {
return el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' },items.map(trabajo => {
const contacto = getClienteContact(trabajo.cliente);
return el('div', { class: 'bg-white p-4 rounded-lg border' }, [el('div', { class: 'mb-3' }, [el('div', { class: 'flex justify-between items-start mb-2' }, [el('div', { class: 'flex-1' }, [el('h3', { class: 'text-lg font-bold' }, getClienteName(trabajo)),contacto ? el('div', { class: 'text-sm text-gray-600' }, contacto) : null].filter(Boolean)),el('span', {class: `px-2 py-1 rounded text-xs font-semibold ${getPrioridadBadgeClass(trabajo.prioridad)}`}, trabajo.prioridad)]),el('div', { class: 'mb-2' }, [el('span', {class: `px-2 py-1 rounded text-xs font-semibold ${getEstadoBadgeClass(trabajo.estado)}`}, trabajo.estado)]),el('p', {class: 'text-sm text-gray-600 mb-2',style: {display: '-webkit-box',WebkitLineClamp: '2',WebkitBoxOrient: 'vertical',overflow: 'hidden'}}, trabajo.detalles),el('div', { class: 'flex justify-between text-sm' }, [el('div', {}, [el('div', { class: 'text-gray-600' }, 'Presupuesto'),el('div', { class: 'font-semibold text-green-700' }, formatCurrency(trabajo.presupuesto))]),el('div', { class: 'text-right' }, [el('div', { class: 'text-gray-600' }, 'Entrega'),el('div', { class: 'font-semibold' }, formatDate(trabajo.fecha_entrega))])])]),el('div', { class: 'flex gap-2 pt-3 border-t' }, [el('button', {class: 'flex-1 bg-white text-primary border border-primary px-3 py-2 rounded font-semibold text-sm',onclick: () => handleEdit(trabajo)}, 'Editar'),el('button', {class: 'flex-1 bg-white text-red-600 border border-red-600 px-3 py-2 rounded font-semibold text-sm',onclick: () => handleDelete(trabajo.id)}, 'Eliminar')])]);
}));
}
}