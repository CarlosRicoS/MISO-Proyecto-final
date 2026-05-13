Feature: Check-In Digital por Hotel
  feature info:
    description: |
      h3. Feature Relacionada
      Check-In Digital por Hotel
      h3. Historia de Usuario
      Como usuario, quiero hacer check-in digital, para agilizar mi llegada al hotel
      *Criterios de aceptación:*
      * Dado un usuario que llega al hotel, entonces puede hacer check-in digital.
      * Dado el check-in completado, entonces recibe acceso a su habitación.

@digital-checkin @disponibilidad @happy
Scenario: Ver disponibilidad de check-in digital para una reserva
  Given que tengo una reserva confirmada elegible para check-in
  When abro la sección de check-in digital
  Then veo si el check-in está disponible para mi reserva

@digital-checkin @happy @checkin
Scenario: Completar con éxito el check-in digital de una reserva confirmada
  Given que mi reserva está confirmada y el check-in está disponible
  When completo el flujo de check-in digital
  Then recibo confirmación de llegada y acceso al siguiente paso

@digital-checkin @state @edge
Scenario: Rechazar el check-in digital cuando la reserva no está confirmada
  Given que mi reserva no está confirmada
  When intento iniciar el check-in digital
  Then veo un mensaje que indica que la reserva no es elegible
