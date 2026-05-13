Feature: Autenticación de Usuario con Credenciales Seguras
  As a: Viajero o administrador del sistema
  I want: Autenticarme en la plataforma TravelHub usando mi correo electrónico y contraseña
  So that: Puedo acceder de forma segura a mis reservas, perfil y funcionalidades personalizadas

  Background:
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible

  @happy-path @user @smoke
  Scenario: Iniciar sesión con credenciales válidas
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@example.com"
    And ingreso la contraseña "Password123"
    And hago clic en "Sign In"
    Then el sistema genera un token JWT
    And soy redirigido a la pantalla Home
    And veo el mensaje de bienvenida

  @error-handling @user
  Scenario: Rechazar credenciales incorrectas
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@incorrecto.com"
    And ingreso la contraseña "ContraseñaIncorrecta"
    And hago clic en "Sign In"
    Then veo un mensaje de error genérico
    And el mensaje no revela si el correo existe
    And permanezco en la pantalla de inicio de sesión

  @error-handling @user
  Scenario: Pedir inicio de sesión cuando el token expiró
    Given que estoy autenticado
    And mi token JWT ha expirado
    When intento acceder a una página protegida
    Then el sistema solicita reautenticación
    And soy redirigido a la pantalla de inicio de sesión
    And debo ingresar mis credenciales nuevamente

  @error-handling @user
  Scenario: Rechazar una contraseña incorrecta con correo válido
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@valido.com"
    And ingreso la contraseña "ContraseñaIncorrecta"
    And hago clic en "Sign In"
    Then veo un mensaje de error genérico
    And permanezco en la pantalla de inicio de sesión

  @error-handling @user
  Scenario: Validar campos obligatorios en el inicio de sesión
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When dejo el campo de correo electrónico vacío
    And dejo el campo de contraseña vacío
    And hago clic en "Sign In"
    Then veo un mensaje de error indicando campos requeridos
    And el formulario no se procesa

  @error-handling @user
  Scenario: Rechazar una contraseña demasiado corta
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@example.com"
    And ingreso la contraseña "123"
    And hago clic en "Sign In"
    Then veo un mensaje de error indicando requisitos de contraseña
    And el mensaje especifica mínimo 8 caracteres

  @error-handling @user
  Scenario: Rechazar una contraseña sin mayúscula
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@example.com"
    And ingreso la contraseña "password123"
    And hago clic en "Sign In"
    Then veo un mensaje de error indicando requisitos de contraseña
    And el mensaje especifica incluir mayúscula

  @error-handling @user
  Scenario: Rechazar una contraseña sin número
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "usuario@example.com"
    And ingreso la contraseña "Password"
    And hago clic en "Sign In"
    Then veo un mensaje de error indicando requisitos de contraseña
    And el mensaje especifica incluir número

  @error-handling @user
  Scenario: Rechazar un correo inexistente
    Given que estoy en la pantalla de inicio de sesión
    And el formulario de autenticación está visible
    When ingreso el correo electrónico "noexiste@travelhub.com"
    And ingreso la contraseña "Password123"
    And hago clic en "Sign In"
    Then veo un mensaje de error genérico
    And el mensaje no revela que el correo no existe
