Feature: Consulta Offline de Catálogo en Aplicación Móvil
  feature info:
    description: |
      h3. Feature Relacionada
      Consulta Offline de Catálogo en Aplicación Móvil
      h3. Historia de Usuario
      Como usuario, quiero consultar propiedades sin conexión, para poder buscar en lugares sin internet
      *Criterios de aceptación:*
      * Dado que el usuario tiene datos guardados, entonces puede consultar propiedades offline.
      * Dado la consulta offline, entonces puede ver información básica de las propiedades.

@offline @search-results @happy-path
Scenario: Mostrar propiedades en resultados de búsqueda desde caché cuando no hay conexión
  Given que ya consulté propiedades previamente con conexión activa
  When pierdo la conexión y abro los resultados de búsqueda
  Then veo las propiedades cacheadas disponibles sin conexión

@offline @search-results @happy-path
Scenario: Abrir el detalle básico de una propiedad almacenada en caché estando offline
  Given que veo una propiedad cacheada en los resultados offline
  When la selecciono para ver su detalle
  Then veo la información básica almacenada en caché de esa propiedad

@offline @search-results @happy-path
Scenario: Ver nombre, ubicación y precio estimado de propiedades cacheadas en modo sin conexión
  Given que estoy en modo sin conexión con propiedades cacheadas
  When reviso la lista de resultados
  Then veo el nombre, la ubicación y el precio estimado de cada propiedad

@offline @search-results @edge-case
Scenario: Informar que no hay resultados disponibles cuando la caché local está vacía y no hay conexión
  Given que no existen propiedades guardadas en la caché local
  When ingreso a los resultados de búsqueda sin conexión
  Then veo un estado vacío que indica que no hay resultados disponibles

@offline @search-results @edge-case
Scenario: Mantener visibles las propiedades previamente cargadas aunque falle la conexión durante la navegación
  Given que ya cargué resultados de búsqueda con conexión
  When la conexión falla mientras navego por la pantalla
  Then continúo viendo las propiedades previamente cargadas
