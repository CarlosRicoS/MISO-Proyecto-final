Feature: Creación de Reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Creación de Reserva
      h3. Historia de Usuario
      Como usuario registrado, quiero crear una reserva para una propiedad seleccionada, para asegurar un alojamiento para mis fechas deseadas
      *Criterios de aceptación:*
      * Dado un usuario que selecciona una propiedad, entonces puede ingresar fechas y número de personas.
      * Dado la reserva creada, entonces recibe confirmación y puede proceder al pago.

  As a: Usuario registrado
  I want: Crear una reserva para una propiedad seleccionada
  So that: Pueda asegurar un alojamiento para mis fechas deseadas

  Background:
    Given que estoy logueado como usuario "usuario@example.com"
    And una propiedad está disponible para las fechas seleccionadas
    And he seleccionado una propiedad de los resultados de búsqueda

@booking-creation @happy-path @smoke
Scenario: Crear una reserva con datos válidos
  Given que estoy viendo el detalle de una propiedad disponible
  When selecciono una fecha de llegada válida
  And selecciono una fecha de salida válida
  And indico "2" huéspedes
  And confirmo la creación de la reserva
  Then veo la confirmación de la reserva creada
  And obtengo un identificador de reserva generado por el sistema

@booking-creation @happy-path @pricing
Scenario: Ver el total calculado antes de confirmar la reserva
  Given que estoy viendo el detalle de una propiedad disponible
  When selecciono fechas válidas para la estadía
  And indico la cantidad de huéspedes permitida
  Then veo el precio total actualizado antes de confirmar
  And el valor mostrado coincide con las fechas seleccionadas

@booking-creation @edge-case @validation
Scenario: Rechazar una reserva con fechas invertidas
  Given que estoy viendo el detalle de una propiedad disponible
  When selecciono una fecha de llegada posterior a la fecha de salida
  And intento confirmar la reserva
  Then veo un mensaje de error de validación
  And la reserva no se crea

@booking-creation @edge-case @availability
Scenario: Evitar crear una reserva cuando la propiedad deja de estar disponible
  Given que estoy viendo el detalle de una propiedad disponible
  When completo los datos de la reserva correctamente
  And la propiedad deja de estar disponible antes de confirmar
  And intento continuar
  Then veo un mensaje indicando que la propiedad ya no está disponible
  And no se genera una reserva confirmada

@booking-creation @edge-case @required-fields
Scenario: Validar campos obligatorios para crear la reserva
  Given que estoy en el formulario de creación de reserva
  When dejo vacías las fechas de estadía
  And dejo vacío el número de huéspedes
  And intento confirmar la reserva
  Then veo mensajes de campos requeridos
  And no se procesa la solicitud

 