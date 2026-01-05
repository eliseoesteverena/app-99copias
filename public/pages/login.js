import { el, mount } from '../mount.js';
import { supabase } from '../config.js';

export async function renderLogin(container) {
  console.log('🔐 Renderizando login...');
  
  // Ocultar template si está visible
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (sidebar) sidebar.style.display = 'none';
  if (topbar) topbar.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  
  // Ajustar main-content
  container.style.marginTop = '0';
  container.style.marginLeft = '0';
  container.style.background = 'white';
  
  mount(container, 'div', {
    class: 'flex items-center justify-center min-h-screen',
    style: { padding: '2rem' }
  }, [
    el('div', {
      class: 'w-full',
      style: { maxWidth: '400px' }
    }, [
      el('h1', { class: 'text-3xl font-bold text-center mb-6' }, 'Iniciar Sesión'),
      
      el('form', {
        id: 'loginForm',
        class: 'bg-white p-6 rounded-lg border',
        onsubmit: handleLogin
      }, [
        el('div', { class: 'mb-4' }, [
          el('label', {
            for: 'email',
            class: 'block text-sm font-semibold mb-2'
          }, 'Correo Electrónico'),
          el('input', {
            type: 'email',
            id: 'email',
            required: true,
            class: 'w-full p-3 border rounded-md',
            placeholder: 'tu@email.com'
          })
        ]),
        
        el('div', { class: 'mb-4' }, [
          el('label', {
            for: 'password',
            class: 'block text-sm font-semibold mb-2'
          }, 'Contraseña'),
          el('input', {
            type: 'password',
            id: 'password',
            required: true,
            class: 'w-full p-3 border rounded-md',
            placeholder: '••••••••'
          })
        ]),
        
        el('div', {
          id: 'errorMessage',
          class: 'text-red-600 text-sm mb-4',
          role: 'alert'
        }),
        
        el('button', {
          type: 'submit',
          class: 'w-full bg-primary text-white p-3 rounded-md font-semibold hover:bg-primary-dark'
        }, 'Iniciar Sesión'),
        
        el('p', { class: 'text-center text-sm mt-4' }, [
          '¿No tienes cuenta? ',
          el('a', {
            href: '#/register',
            class: 'text-primary font-semibold'
          }, 'Regístrate aquí')
        ])
      ])
    ])
  ]);
  
  async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    errorDiv.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Iniciando sesión...';
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Recargar página para inicializar template
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      errorDiv.textContent = error.message.includes('Invalid') ?
        'Correo o contraseña incorrectos' :
        error.message;
      
      submitButton.disabled = false;
      submitButton.textContent = 'Iniciar Sesión';
    }
  }
}