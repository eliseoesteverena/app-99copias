// public/register.js
import { supabase } from './config.js';

// Verificar si ya hay sesión activa
async function checkSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error verificando sesión:', error);
      return;
    }
    
    if (session) {
      console.log('✅ Ya hay sesión activa, redirigiendo...');
      window.location.href = '/dashboard.html';
    }
  } catch (error) {
    console.error('Error en checkSession:', error);
  }
}

// Validar contraseña
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Debe tener al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
  }
  
  return errors;
}

// Manejar el formulario de registro
async function handleRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('errorMessage');
  const successDiv = document.getElementById('successMessage');
  const submitButton = e.target.querySelector('button[type="submit"]');
  
  // Limpiar mensajes
  errorDiv.textContent = '';
  successDiv.textContent = '';
  
  // Validación de contraseñas
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden';
    return;
  }
  
  // Validar fortaleza de contraseña
  const passwordErrors = validatePassword(password);
  if (passwordErrors.length > 0) {
    errorDiv.innerHTML = `
      <strong>La contraseña debe cumplir:</strong>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
        ${passwordErrors.map(err => `<li>${err}</li>`).join('')}
      </ul>
    `;
    return;
  }
  
  // Deshabilitar botón mientras procesa
  submitButton.disabled = true;
  submitButton.textContent = 'Creando cuenta...';
  
  try {
    console.log('🔄 Registrando usuario:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard.html`,
        data: {
          // Puedes agregar metadata adicional aquí
          registered_at: new Date().toISOString()
        }
      }
    });
    
    if (error) throw error;
    
    console.log('✅ Registro exitoso:', data.user?.email);
    
    // Mensaje de éxito
    successDiv.innerHTML = `
      <strong>¡Cuenta creada exitosamente!</strong><br>
      ${data.user?.identities?.length === 0 
        ? 'Este correo ya está registrado. Usa el login.'
        : 'Por favor verifica tu correo electrónico antes de iniciar sesión.'
      }
    `;
    
    // Limpiar formulario
    e.target.reset();
    
    // Redirigir después de 3 segundos
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error en registro:', error);
    
    let errorMessage = 'Error al crear la cuenta';
    
    if (error.message.includes('User already registered')) {
      errorMessage = 'Este correo ya está registrado. Intenta iniciar sesión.';
    } else if (error.message.includes('Password')) {
      errorMessage = 'La contraseña no cumple los requisitos de seguridad';
    } else {
      errorMessage = error.message;
    }
    
    errorDiv.textContent = errorMessage;
    
    // Rehabilitar botón
    submitButton.disabled = false;
    submitButton.textContent = 'Crear Cuenta';
  }
}

// Inicializar
function init() {
  // Verificar si ya hay sesión
  checkSession();
  
  // Configurar formulario
  const registerForm = document.getElementById('registerForm');
  
  if (!registerForm) {
    console.error('❌ Formulario de registro no encontrado');
    return;
  }
  
  registerForm.addEventListener('submit', handleRegister);
  
  // Indicador visual de fortaleza de contraseña (opcional)
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      const errors = validatePassword(e.target.value);
      const strengthIndicator = document.getElementById('passwordStrength');
      
      if (strengthIndicator) {
        if (errors.length === 0) {
          strengthIndicator.textContent = '✅ Contraseña segura';
          strengthIndicator.style.color = 'green';
        } else {
          strengthIndicator.textContent = `⚠️ ${errors.length} requisito(s) faltante(s)`;
          strengthIndicator.style.color = 'orange';
        }
      }
    });
  }
  
  console.log('✅ Registro inicializado correctamente');
}

// Ejecutar init cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}