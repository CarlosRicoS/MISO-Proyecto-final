Feature: Administración Centralizada de Tarifas Base
  feature info:
    description: |
      h3. Feature Relacionada
      Administración Centralizada de Tarifas Base
      h3. Historia de Usuario
      Como administrador, quiero gestionar tarifas base de propiedades, para establecer precios competitivos y consistentes
      *Criterios de aceptación:*
      * Dado un administrador, entonces puede definir y modificar tarifas base para cada propiedad.
      * Dado que se establece una tarifa base, entonces se aplica como referencia para cálculos de precios dinámicos.

@listado-precios @happy-path
Scenario: Mostrar el listado de precios configurados
  Given que soy un administrador de precios autenticado
  When ingreso al módulo de tarifas base
  Then veo el listado de precios configurados

@edicion-precio @happy-path
Scenario: Editar un precio existente y guardar correctamente
  Given que tengo un precio base editable
  When modifico el valor y guardo los cambios
  Then veo el precio actualizado en la lista

@edicion-precio @happy-path
Scenario: Editar un precio existente y guardar correctamente
  Given que tengo un precio base editable
  When modifico el valor y guardo los cambios
  Then veo el precio actualizado en la lista
