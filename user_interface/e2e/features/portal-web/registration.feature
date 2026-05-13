Feature: Registro de Nuevos Viajeros en la Plataforma
  feature info:
    description: |
      h3. Feature Relacionada
      Registro de Nuevos Viajeros en la Plataforma
      h3. Historia de Usuario
      Como usuario nuevo, quiero registrarme en la plataforma, para poder reservar propiedades
      *Criterios de aceptación:*
      * Dado un usuario que completa el formulario, entonces se crea su cuenta.
      * Dado que la cuenta se ha creado, entonces el usuario recibe confirmación por email.

  As a: Persona interesada en reservar hospedajes
  I want: Registrarme en la plataforma TravelHub
  So that: Puedo acceder a funcionalidades completas de búsqueda y reserva

  Background:
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    And los campos requeridos están identificados

  @happy-path @user @smoke
  Scenario: Completar el registro con datos válidos
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    And los campos requeridos están identificados
    When ingreso el nombre completo "Juan Pérez"
    And ingreso el correo electrónico "juan.perez@example.com"
    And ingreso la contraseña "Password123"
    And confirmo la contraseña "Password123"
    And ingreso la fecha de nacimiento "15/03/1990"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then el sistema valida que las contraseñas coincidan
    And soy redirigido a la pantalla de inicio de sesión
    And veo un mensaje de confirmación de registro

  @error-handling @user
  Scenario: Rechazar contraseñas que no coinciden
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When ingreso el nombre completo "María García"
    And ingreso el correo electrónico "maria.garcia@example.com"
    And ingreso la contraseña "Password123"
    And confirmo la contraseña "Password456"
    And ingreso la fecha de nacimiento "20/05/1995"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo un mensaje de error indicando que las contraseñas no coinciden
    And el formulario no se procesa
    And permanezco en la pantalla de registro

  @error-handling @user
  Scenario: Rechazar una contraseña débil
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When ingreso el nombre completo "Carlos López"
    And ingreso el correo electrónico "carlos.lopez@example.com"
    And ingreso la contraseña "123"
    And confirmo la contraseña "123"
    And ingreso la fecha de nacimiento "10/08/1988"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo un mensaje de error indicando requisitos de contraseña
    And el mensaje especifica mínimo 8 caracteres
    And el mensaje especifica incluir mayúscula
    And el mensaje especifica incluir número
    And el formulario no se procesa

  @error-handling @user
  Scenario: Rechazar un correo electrónico inválido
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When ingreso el nombre completo "Ana Martínez"
    And ingreso el correo electrónico "ana.martinez@invalido"
    And ingreso la contraseña "Password123"
    And confirmo la contraseña "Password123"
    And ingreso la fecha de nacimiento "05/12/1992"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo un mensaje de error indicando formato de correo inválido
    And el formulario no se procesa

  @error-handling @user
  Scenario: Rechazar un correo ya registrado
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When ingreso el nombre completo "Pedro Ruiz"
    And ingreso el correo electrónico "usuario@travelhub.com"
    And ingreso la contraseña "Password123"
    And confirmo la contraseña "Password123"
    And ingreso la fecha de nacimiento "12/07/1985"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo un mensaje de error indicando que el correo ya está registrado
    And el mensaje no revela si el correo existe en login
    And el formulario no se procesa

  @error-handling @user
  Scenario: Rechazar una fecha de nacimiento inválida
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When ingreso el nombre completo "Lucía Fernández"
    And ingreso el correo electrónico "lucia.fernandez@example.com"
    And ingreso la contraseña "Password123"
    And confirmo la contraseña "Password123"
    And ingreso la fecha de nacimiento "32/02/1990"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo un mensaje de error indicando fecha inválida
    And el formulario no se procesa

  @error-handling @user
  Scenario: Validar campos obligatorios en el registro
    Given que estoy en la pantalla de registro
    And el formulario de registro está visible
    When dejo el campo de nombre vacío
    And dejo el campo de correo electrónico vacío
    And dejo el campo de contraseña vacío
    And ingreso la fecha de nacimiento "15/03/1990"
    And selecciono el tipo de usuario "Viajero"
    And hago clic en "Registrarse"
    Then veo mensajes de error para cada campo requerido
    And el formulario no se procesa
