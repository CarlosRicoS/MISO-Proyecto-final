Feature: Dashboard Ejecutivo para Hoteles con Métricas Clave
  feature info:
    description: |
      h3. Feature Relacionada
      Dashboard Ejecutivo para Hoteles con Métricas Clave
      h3. Historia de Usuario
      Como gerente de hotel, quiero ver un dashboard con métricas clave, para tomar decisiones informadas
      *Criterios de aceptación:*
      * Dado un gerente de hotel, entonces puede ver métricas de ocupación, ingresos y reservas.
      * Dado el dashboard, entonces muestra gráficos y tablas con datos actualizados.

@dashboard @ocupacion @kpi
Scenario: Visualizar el resumen ejecutivo de ocupación actual con KPIs clave
  Given que soy un gerente de hotel autenticado
  When abro el dashboard ejecutivo
  Then veo los KPIs de ocupación, ingresos y reservas actuales

@dashboard @ingresos @grafica
Scenario: Consultar la evolución de ingresos mensuales en la gráfica principal
  Given que estoy en el dashboard ejecutivo
  When reviso la gráfica de ingresos mensuales
  Then veo la evolución de ingresos del periodo seleccionado

@dashboard @reservas @tendencias
Scenario: Revisar el estado y la tendencia de reservas activas y próximas
  Given que existen reservas activas y próximas para el hotel
  When consulto la sección de reservas del dashboard
  Then veo el estado actual y su tendencia

@dashboard @reservas @tendencias
Scenario: Revisar el estado y la tendencia de reservas activas y próximas
  Given que existen reservas activas y próximas para el hotel
  When consulto la sección de reservas del dashboard
  Then veo el estado actual y su tendencia
