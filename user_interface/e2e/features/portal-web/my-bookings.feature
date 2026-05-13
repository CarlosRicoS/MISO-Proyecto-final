Feature: Ver reservas de usuario
  feature info:
    description: |
      h3. Feature Relacionada
      Ver reservas de usuario
      h3. Historia de Usuario
      Como usuario, quiero ver mis reservas, para conocer el estado de mis reservas
      *Criterios de aceptación:*
      * Dado un usuario logueado, entonces puede ver su historial de reservas.
      * Dado el historial, entonces puede ver detalles de cada reserva.

@my-bookings @happy-path @smoke
Scenario: Mostrar el listado de reservas del usuario
  Given que estoy autenticado como usuario con reservas registradas
  When ingreso a la lista de mis reservas
  Then veo el listado completo de mis reservas

@my-bookings @filter @status
Scenario: Filtrar reservas por estado y ver solo las coincidencias
  Given que estoy en la lista de mis reservas
  When filtro por un estado específico
  Then veo únicamente las reservas que coinciden con ese estado

@my-bookings @filter @date
Scenario: Filtrar reservas por fecha de entrada y salida
  Given que tengo reservas con diferentes fechas
  When filtro por rango de fechas
  Then veo solo las reservas dentro del periodo seleccionado

@my-bookings @edge-case @empty-state
Scenario: Mostrar un estado vacío cuando el usuario no tiene reservas
  Given que mi cuenta no tiene reservas
  When ingreso a la lista de mis reservas
  Then veo un estado vacío sin elementos para mostrar

@my-bookings @status @detail
Scenario: Visualizar el estado de cada reserva en la lista
  Given que tengo reservas con distintos estados
  When reviso el listado
  Then veo el estado visible junto a cada reserva

@my-bookings @status @update
Scenario: Reflejar correctamente cambios recientes de estado en la lista
  Given que el estado de una reserva cambió recientemente
  When refresco la lista de mis reservas
  Then veo el estado actualizado en la vista

@my-bookings @edge-case @filters
Scenario: Mantener resultados coherentes cuando no hay coincidencias en los filtros
  Given que aplico filtros que no coinciden con ninguna reserva
  When ejecuto la búsqueda filtrada
  Then veo un estado sin resultados coherente con los filtros aplicados
