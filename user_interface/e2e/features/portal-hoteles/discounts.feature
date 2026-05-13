Feature: Gestión de Descuentos y Promociones Específicas
  feature info:
    description: |
      h3. Feature Relacionada
      Gestión de Descuentos y Promociones Específicas
      h3. Historia de Usuario
      Como administrador, quiero gestionar descuentos y promociones específicas, para ofrecer tarifas competitivas
      *Criterios de aceptación:*
      * Dado un administrador, entonces puede crear y gestionar descuentos.
      * Dado que se aplica un descuento, entonces el precio se actualiza automáticamente.

@smoke @lista @descuentos
Scenario: Listar descuentos activos y vencidos
  Given que soy un administrador con acceso al módulo de descuentos
  When abro la sección de descuentos y promociones
  Then veo los descuentos activos y vencidos

@happy-path @crear @descuentos
Scenario: Crear un descuento válido para una propiedad
  Given que tengo una propiedad con descuento habilitado
  When creo un descuento con datos válidos
  Then el descuento se guarda y queda disponible para usar

@happy-path @aplicar @descuentos
Scenario: Aplicar un descuento a una tarifa disponible
  Given que existe una tarifa elegible para descuento
  When aplico el descuento a esa tarifa
  Then veo el precio actualizado con la promoción aplicada

@happy-path @estado @descuentos
Scenario: Activar y desactivar un descuento manualmente
  Given que tengo un descuento guardado
  When cambio su estado entre activo e inactivo
  Then el sistema refleja correctamente el nuevo estado

@happy-path @estado @descuentos
Scenario: Activar y desactivar un descuento manualmente
  Given que tengo un descuento guardado
  When cambio su estado entre activo e inactivo
  Then el sistema refleja correctamente el nuevo estado
