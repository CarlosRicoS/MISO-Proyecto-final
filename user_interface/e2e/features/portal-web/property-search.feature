# ==========================================================================
# Feature: Búsqueda Rápida de Hospedajes con Múltiples Filtros
# ==========================================================================
# US-4: Búsqueda Rápida de Hospedajes con Múltiples Filtros
#
# Como: Usuario registrado
# Quiero: Buscar hospedajes con múltiples filtros
# Para: Encontrar el alojamiento ideal para mis necesidades
#
# ==========================================================================

Feature: Búsqueda Rápida de Hospedajes con Múltiples Filtros
  feature info:
    description: |
      h3. Feature Relacionada
      Búsqueda Rápida de Hospedajes con Múltiples Filtros
      h3. Historia de Usuario
      Como usuario registrado, quiero buscar hospedajes con múltiples filtros, para encontrar el alojamiento ideal para mis necesidades
      *Criterios de aceptación:*
      * Dado un usuario que busca propiedades, entonces puede aplicar filtros de ciudad, precio, capacidad, etc.
      * Dado los filtros aplicados, entonces el sistema muestra resultados relevantes.

  As a: Usuario registrado
  I want: Buscar hospedajes con múltiples filtros
  So that: Pueda encontrar el alojamiento ideal para mis necesidades

  Background:
    Given que estoy en la página de búsqueda de hospedajes
    And el sistema está listo para recibir filtros

  # ==========================================================================
  # Happy Path Scenarios - Búsqueda Exitosa
  # ==========================================================================

@property-search @happy-path @smoke
Scenario: Buscar hospedajes por ciudad y ver resultados relevantes
  Given que estoy en la página de búsqueda de hospedajes
  When selecciono la ciudad "Medellín"
  And aplico la búsqueda
  Then veo propiedades disponibles en Medellín
  And cada resultado corresponde a la ciudad seleccionada

@property-search @happy-path @filters
Scenario: Filtrar hospedajes por ciudad, precio y capacidad
  Given que estoy en la página de búsqueda de hospedajes
  When selecciono la ciudad "Bogotá"
  And establezco un precio máximo de "350000"
  And indico una capacidad mínima de "2" personas
  And aplico los filtros
  Then veo solo propiedades que cumplen con la ciudad, el precio y la capacidad
  And los resultados se actualizan sin recargar la página

@property-search @happy-path @date-range
Scenario: Buscar hospedajes disponibles para un rango de fechas
  Given que estoy en la página de búsqueda de hospedajes
  When selecciono una fecha de llegada válida
  And selecciono una fecha de salida válida
  And aplico la búsqueda
  Then veo propiedades disponibles para ese rango de fechas
  And los resultados excluyen hospedajes no disponibles

@property-search @edge-case @empty-state
Scenario: Mostrar un estado vacío cuando no hay coincidencias
  Given que estoy en la página de búsqueda de hospedajes
  When selecciono la ciudad "Ciudad inexistente"
  And establezco un precio máximo de "1"
  And aplico los filtros
  Then veo un estado sin resultados
  And el sistema me permite limpiar los filtros

@property-search @edge-case @validation
Scenario: Rechazar un rango de fechas inválido
  Given que estoy en la página de búsqueda de hospedajes
  When selecciono una fecha de llegada posterior a la fecha de salida
  And aplico la búsqueda
  Then veo un mensaje de validación sobre las fechas
  And no se ejecuta la búsqueda hasta corregir el rango

@property-search @edge-case @reset
Scenario: Limpiar filtros y restaurar el listado inicial
  Given que tengo filtros aplicados en la búsqueda
  When limpio todos los filtros
  Then veo nuevamente el listado inicial de hospedajes
  And desaparecen los criterios de filtrado activos

  
