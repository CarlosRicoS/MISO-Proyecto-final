Feature: Generación de Reportes de Ingresos
  feature info:
    description: |
      h3. Feature Relacionada
      Reporte de ocupación, ingresos y comisiones
      h3. Historia de Usuario
      Como gerente de hotel o agencia de viajes, quiero generar reportes detallados ingresos, para análisis financiero, contabilidad y facturación
      *Criterios de aceptación:*
      * Dado un gerente que solicita reporte para un periodo, entonces el sistema genera archivo con desglose por reserva: fecha, código, tarifa bruta, impuestos, comisión TravelHub e ingreso neto.
      * Dado el archivo descargado, entonces el formato es CSV UTF-8 compatible con herramientas contables.

@reporte @feliz @generacion
Scenario: Generar reporte de ingresos con totales, impuestos y comisiones para un rango válido
  Given que soy un gerente con acceso a reportes financieros
  When solicito el reporte de ingresos para un rango de fechas válido
  Then el sistema genera un reporte con totales, impuestos y comisiones

@reporte @csv @exportacion
Scenario: Exportar el reporte de ingresos a CSV con el detalle correcto de totales e impuestos
  Given que ya generé el reporte de ingresos
  When selecciono la opción de exportar a CSV
  Then descargo un archivo CSV con el detalle correcto del reporte

@reporte @rangos-fecha @validacion
Scenario: Validar que no se permita generar el reporte con un rango de fechas inválido
  Given que selecciono un rango de fechas inválido
  When intento generar el reporte
  Then veo un mensaje de validación y el reporte no se genera

@reporte @rangos-fecha @bordes
Scenario: Generar el reporte correctamente para un rango de fechas en el borde del período seleccionado
  Given que el rango de fechas toca el límite del periodo consultado
  When genero el reporte de ingresos
  Then el sistema calcula correctamente los registros del borde del periodo

@reporte @impuestos @comisiones @totales
Scenario: Calcular correctamente impuestos, comisiones y totales netos en el reporte de ingresos
  Given que existen reservas con cargos aplicables
  When el sistema arma el reporte de ingresos
  Then veo impuestos, comisión TravelHub e ingreso neto calculados correctamente

@reporte @sin-datos @vacio
Scenario: Mostrar estado vacío cuando no existen ingresos en el rango de fechas consultado
  Given que no existen ingresos en el rango consultado
  When genero el reporte de ingresos
  Then veo un estado vacío sin registros para exportar

@reporte @error @fallback
Scenario: Mostrar mensaje de error cuando falla la generación o exportación del reporte
  Given que el servicio de reportes falla
  When intento generar o exportar el reporte
  Then veo un mensaje de error y la acción queda sin completar
