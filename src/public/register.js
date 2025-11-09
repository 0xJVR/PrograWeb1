// Redirigir si ya hay token
(function () {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.replace('/');
    }
  })();
  
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const btnText = document.getElementById('btnText');
    const btnLoading = document.getElementById('btnLoading');
    const alertContainer = document.getElementById('alertContainer');
  
    const showMsg = (type, msg) => {
      alertContainer.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    };
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertContainer.innerHTML = '';
  
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
  
      if (password !== confirmPassword) {
        showMsg('error', 'Las contraseñas no coinciden');
        return;
      }
  
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
  
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
  
        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('Respuesta inesperada del servidor');
        }
  
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          showMsg('success', '¡Registro exitoso! Redirigiendo...');
          setTimeout(() => window.location.replace('/'), 600);
        } else {
          showMsg('error', data.message || 'Error al registrarse');
          btnText.style.display = 'inline';
          btnLoading.style.display = 'none';
        }
      } catch (err) {
        console.error('Register error:', err);
        showMsg('error', err.message || 'Error de conexión. Intenta de nuevo.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });
  });
  