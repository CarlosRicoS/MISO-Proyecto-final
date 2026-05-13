Feature: Generación de Reportes de Ocupación
  feature info:
    description: |
      h3. Feature Relacionada
      Reporte de ocupación, ingresos y comisiones
      h3. Historia de Usuario
      Como gerente de hotel o agencia de viajes, quiero generar reportes detallados de ocupación, para análisis financiero, contabilidad y facturación
      *Criterios de aceptación:*
      * Dado un gerente que solicita reporte para un periodo, entonces el sistema genera archivo con desglose por reserva: fecha, código, tarifa bruta, impuestos, comisión TravelHub e ingreso neto.
      * Dado el archivo descargado, entonces el formato es CSV UTF-8 compatible con herramientas contables.

@ocupacion @diaria @feliz
Scenario: Ver la ocupación diaria del hotel en el periodo seleccionado
  Given que soy un gerente con acceso al reporte de ocupación
  When consulto el reporte para un periodo específico
  Then veo la ocupación diaria del hotel

@ocupacion @diaria @feliz
Scenario: Ver la ocupación diaria del hotel en el periodo seleccionado
  Given que soy un gerente con acceso al reporte de ocupación
  When consulto el reporte para un periodo específico
  Then veo la ocupación diaria del hotel
