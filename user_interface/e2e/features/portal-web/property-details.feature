Feature: Visualizar detalle de hospedajes
  feature info:
    description: |
      h3. Feature Relacionada
      Visualizar detalle de hospedajes
      h3. Historia de Usuario
      Como usuario, quiero ver el detalle de una propiedad, para conocer más información antes de reservar
      *Criterios de aceptación:*
      * Dado un usuario que selecciona una propiedad, entonces ve fotos, descripción y disponibilidad.
      * Dado el detalle de la propiedad, entonces puede ver tarifas y políticas de cancelación.

@property-details @happy-path @smoke
Scenario: Mostrar la información básica de la propiedad
  Given que seleccioné una propiedad desde los resultados de búsqueda
  When ingreso a la página de detalle
  Then veo el nombre, la descripción y la ubicación de la propiedad

@property-details @gallery @happy-path
Scenario: Navegar la galería de imágenes de la propiedad
  Given que estoy en el detalle de una propiedad con imágenes disponibles
  When navego por la galería
  Then veo las fotografías de la propiedad una por una

@property-details @amenities @edge-case
Scenario: Visualizar los servicios disponibles y manejar una lista vacía de amenidades
  Given que la propiedad tiene servicios publicados
  When reviso la sección de amenidades
  Then veo los servicios disponibles o un estado vacío si no hay amenidades

@property-details @pricing @happy-path
Scenario: Ver el desglose de precios y el total por noche
  Given que estoy viendo los detalles de la propiedad
  When consulto la sección de precios
  Then veo el desglose y el total por noche calculado correctamente

@property-details @availability @happy-path
Scenario: Consultar la disponibilidad de fechas para reservar la propiedad
  Given que estoy en la página de detalle de la propiedad
  When consulto el calendario de disponibilidad
  Then veo las fechas libres para reservar

@property-details @availability @pricing @edge-case
Scenario: Mostrar un estado de no disponibilidad cuando no hay fechas libres
  Given que no existen fechas disponibles para la propiedad
  When consulto la disponibilidad
  Then veo un mensaje que indica que no hay fechas libres

@property-details @error @edge-case
Scenario: Mostrar un mensaje de error cuando falla la carga de los detalles de la propiedad
  Given que el servicio de detalle no responde
  When intento abrir la propiedad
  Then veo un mensaje de error con opción para reintentar
