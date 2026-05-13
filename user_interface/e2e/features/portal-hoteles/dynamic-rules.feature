Feature: Motor de Reglas Dinámicas para Descuentos Automáticos
  feature info:
    description: |
      h3. Feature Relacionada
      Motor de Reglas Dinámicas para Descuentos Automáticos
      h3. Historia de Usuario
      Como administrador, quiero configurar reglas dinámicas de descuentos, para automatizar promociones según condiciones específicas
      *Criterios de aceptación:*
      * Dado un administrador, entonces puede definir reglas de descuento basadas en fechas, temporada, ocupación, etc.
      * Dado que se aplica una regla, entonces el precio se ajusta automáticamente según las condiciones.

@ruta-happy @configuracion @persistencia
Scenario: Configurar una regla dinámica de precios con valores válidos
  Given que soy un administrador autenticado
  When configuro una nueva regla dinámica con valores válidos
  Then la regla se guarda y queda disponible para aplicarse

@activacion @happy-path @persistencia
Scenario: Activar una regla dinámica y guardar su estado correctamente
  Given que existe una regla dinámica inactiva
  When la activo desde el módulo de configuración
  Then la regla queda guardada como activa

@activacion @happy-path @persistencia
Scenario: Activar una regla dinámica y guardar su estado correctamente
  Given que existe una regla dinámica inactiva
  When la activo desde el módulo de configuración
  Then la regla queda guardada como activa
