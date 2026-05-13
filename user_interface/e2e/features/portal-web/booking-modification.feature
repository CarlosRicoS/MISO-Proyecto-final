# ==========================================================================
# Feature: Modificación de Fechas de Reserva
# ==========================================================================
# US-7: Modificación de Fechas de Reserva
#
# Como: Usuario registrado
# Quiero: Modificar las fechas de mi reserva existente
# Para: Poder ajustar mis fechas de viaje según mis necesidades
#
# ==========================================================================

Feature: Modificación de Fechas de Reserva
  feature info:
    description: |
      h3. Feature Relacionada
      Modificación de Fechas de Reserva
      h3. Historia de Usuario
      Como usuario registrado, quiero modificar las fechas de mi reserva existente, para poder ajustar mis fechas de viaje según mis necesidades
      *Criterios de aceptación:*
      * Dado un usuario con una reserva, entonces puede modificar las fechas dentro de las políticas permitidas.
      * Dado la modificación de fechas, entonces se actualiza el precio y se envía notificación.

  As a: Usuario registrado
  I want: Modificar las fechas de mi reserva existente
  So that: Pueda ajustar mis fechas de viaje según mis necesidades

  Background:
    Given que estoy logueado como usuario "usuario@example.com"
    And tengo una reserva confirmada con ID "RES-001"
    And la reserva tiene fecha límite para modificación
    And estoy en la pantalla de mis reservas

  # ==========================================================================
  # Happy Path Scenarios - Modificación Exitosa
  # ==========================================================================

@booking-modification @happy-path @smoke
Scenario: Modificar las fechas de una reserva dentro de la ventana permitida
  Given que tengo una reserva confirmada con ID "RES-001"
  When abro la opción de modificar fechas
  And selecciono una nueva fecha de llegada válida
  And selecciono una nueva fecha de salida válida
  And confirmo la modificación
  Then veo la reserva actualizada con las nuevas fechas
  And recibo una confirmación de cambio exitoso

@booking-modification @happy-path @pricing
Scenario: Ver el precio recalculado después de cambiar las fechas
  Given que tengo una reserva confirmada con ID "RES-001"
  When cambio las fechas de la reserva por otras válidas
  Then veo el precio total recalculado
  And el valor mostrado refleja la nueva estadía

@booking-modification @edge-case @deadline
Scenario: Rechazar una modificación fuera de la fecha límite permitida
  Given que mi reserva ya superó la fecha límite de modificación
  When intento cambiar las fechas de la reserva
  Then veo un mensaje indicando que la modificación ya no está permitida
  And la reserva mantiene sus fechas originales

@booking-modification @edge-case @validation
Scenario: Rechazar un rango de fechas inválido al modificar la reserva
  Given que tengo una reserva confirmada con ID "RES-001"
  When selecciono una fecha de llegada posterior a la fecha de salida
  And intento confirmar el cambio
  Then veo un mensaje de validación sobre el rango de fechas
  And no se guardan cambios en la reserva

@booking-modification @edge-case @availability
Scenario: Bloquear la modificación cuando no hay disponibilidad para las nuevas fechas
  Given que tengo una reserva confirmada con ID "RES-001"
  When selecciono nuevas fechas válidas para el formulario
  And esas fechas no tienen disponibilidad
  And confirmo la modificación
  Then veo un mensaje indicando que no hay disponibilidad
  And la reserva permanece sin cambios

  