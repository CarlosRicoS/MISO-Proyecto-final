Feature: Rechazar reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Rechazar reserva
      h3. Historia de Usuario
      Como administrador, quiero rechazar reservas, para mantener el control de las reservas
      *Criterios de aceptación:*
      * Dado un administrador que tiene acceso a la reserva, entonces puede rechazarla.
      * Dado que la reserva ha sido rechazada, entonces el usuario recibe notificación.

@happy-path @rechazo @pendiente
Scenario: Rechazar una reserva pendiente con un motivo válido
  Given que soy un administrador con acceso a reservas pendientes
  When rechazo una reserva pendiente con un motivo válido
  Then la reserva queda rechazada y el usuario recibe notificación

@happy-path @rechazo @confirmada
Scenario: Rechazar una reserva confirmada cuando la política lo permite
  Given que la política permite rechazar reservas confirmadas
  When rechazo una reserva confirmada
  Then la reserva cambia a estado rechazado y se notifica al usuario

@happy-path @rechazo @confirmada
Scenario: Rechazar una reserva confirmada cuando la política lo permite
  Given que la política permite rechazar reservas confirmadas
  When rechazo una reserva confirmada
  Then la reserva cambia a estado rechazado y se notifica al usuario
