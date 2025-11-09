// Redirigir si ya hay token
(function () {
    const token = localStorage.getItem('token');
    if (token) {
      // Usa replace para no dejar la página de login en el historial
      window.location.replace('/');
    }
  })();
  
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const alertContainer = document.getElementById('alertContainer');
  
    const showMsg = (type, msg) => {
      alertContainer.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    };
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
      alertContainer.innerHTML = '';
  
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
  
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
  
        let data;
        try {
          data = await response.json();
        } catch {
          // Si no es JSON, enseña error legible
          throw new Error('Respuesta inesperada del servidor');
        }
  
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          showMsg('success', '¡Inicio de sesión exitoso! Redirigiendo...');
          setTimeout(() => window.location.replace('/'), 600);
        } else {
          showMsg('error', data.message || 'Error al iniciar sesión');
          btnText.style.display = 'inline';
          btnLoading.style.display = 'none';
        }
      } catch (err) {
        console.error('Login error:', err);
        showMsg('error', err.message || 'Error de conexión. Intenta de nuevo.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });
  });
  