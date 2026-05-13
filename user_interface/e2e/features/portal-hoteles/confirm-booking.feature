Feature: Confirmar reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Confirmar reserva
      h3. Historia de Usuario
      Como administrador, quiero confirmar reservas, para mantener el control de las reservas
      *Criterios de aceptación:*
      * Dado un administrador que tiene acceso a la reserva, entonces puede confirmarla.
      * Dado que la reserva ha sido confirmada, entonces el usuario recibe notificación.

@confirmacion @happy-path
Scenario: Confirmar una reserva pendiente exitosamente
  Given que soy un administrador con acceso a reservas pendientes
  When confirmo una reserva pendiente
  Then la reserva queda confirmada y visible para el usuario

@confirmacion @approved @happy-path
Scenario: Confirmar una reserva aprobada cuando aplique
  Given que existe una reserva aprobada lista para confirmarse
  When ejecuto la confirmación desde el panel de administración
  Then la reserva pasa al estado confirmado

@confirmacion @duplicate @edge-case
Scenario: Evitar confirmar dos veces la misma reserva
  Given que una reserva ya está confirmada
  When intento confirmarla nuevamente
  Then el sistema evita la confirmación duplicada
