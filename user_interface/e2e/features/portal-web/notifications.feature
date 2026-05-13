Feature: Notificaciones Automáticas de Estado de Reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Notificaciones Automáticas de Estado de Reserva
      h3. Historia de Usuario
      Como usuario, quiero recibir notificaciones automáticas, para estar informado sobre el estado de mis reservas
      *Criterios de aceptación:*
      * Dado un cambio de estado en una reserva, entonces el usuario recibe notificación.
      * Dado la notificación, entonces puede ver el nuevo estado de su reserva.

@notificaciones @happy-path
Scenario: Visualizar la notificación de una reserva confirmada con el nuevo estado
  Given que estoy autenticado como usuario con reservas activas
  When se registra un cambio de estado en una de mis reservas
  Then veo una notificación con el nuevo estado confirmado

@notificaciones @happy-path
Scenario: Ver varias notificaciones de cambios de estado de reservas en la lista
  Given que tengo múltiples reservas con cambios recientes
  When abro la bandeja de notificaciones
  Then veo todas las notificaciones ordenadas por fecha de forma descendente

@notificaciones @happy-path @mobile @web
Scenario: Abrir el detalle de una notificación y comprobar el estado actualizado de la reserva
  Given que estoy viendo una notificación de reserva en la lista
  When abro el detalle de esa notificación
  Then veo el estado actualizado de la reserva asociado a la notificación

@notificaciones @edge-case
Scenario: Mostrar estado vacío cuando no existen notificaciones
  Given que no tengo notificaciones registradas
  When ingreso a la página de notificaciones
  Then veo un estado vacío que indica que no hay notificaciones
