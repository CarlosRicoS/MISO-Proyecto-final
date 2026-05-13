Feature: Visualización Detallada de Reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Visualización Detallada de Reserva
      h3. Historia de Usuario
      Como usuario registrado, quiero ver los detalles completos de mi reserva, para conocer toda la información sobre mi alojamiento
      *Criterios de aceptación:*
      * Dado un usuario con una reserva, entonces puede ver todos los detalles de la reserva.
      * Dado el detalle de la reserva, entonces puede ver información de propiedad, fechas, precios y estado.

  As a: Usuario registrado
  I want: Ver los detalles completos de mi reserva
  So que: Pueda conocer toda la información sobre mi alojamiento

  Background:
    Given que estoy logueado como usuario "usuario@example.com"
    And tengo una reserva confirmada con ID "RES-001"
    And estoy en la pantalla de mis reservas

@booking-detail @happy-path @smoke
Scenario: Ver el detalle completo de una reserva
  Given que tengo una reserva confirmada con ID "RES-001"
  When abro el detalle de la reserva
  Then veo la información completa de la propiedad
  And veo las fechas de entrada y salida
  And veo el estado actual de la reserva

@booking-detail @happy-path @pricing
Scenario: Consultar el desglose de precios de una reserva
  Given que tengo una reserva confirmada con ID "RES-001"
  When reviso la sección de precios
  Then veo el subtotal, impuestos y total de la reserva
  And los valores se muestran de forma consistente

@booking-detail @happy-path @status
Scenario: Ver el estado de pago y confirmación de la reserva
  Given que tengo una reserva confirmada con ID "RES-001"
  When abro el detalle de la reserva
  Then veo el estado de confirmación
  And veo si el pago fue aprobado o está pendiente

@booking-detail @edge-case @not-found
Scenario: Mostrar un estado de reserva no encontrada
  Given que intento abrir una reserva inexistente
  When solicito el detalle de la reserva
  Then veo un mensaje indicando que la reserva no fue encontrada
  And el sistema me permite volver a mis reservas
