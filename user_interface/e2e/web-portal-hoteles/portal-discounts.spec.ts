import { test } from '@playwright/test';

// Gherkin: discounts.feature — "Gestión de Descuentos y Promociones Específicas"
//
// The portal-hoteles Angular project does not yet ship a /discounts route or
// any UI for managing discounts. The routes currently registered are:
//   /login, /dashboard, /dashboard/:reservationId, /pricing, /reports
// (see projects/portal-hoteles/src/app/app-routing.module.ts).
//
// All scenarios from discounts.feature are therefore skipped here with
// explicit TODOs, so the Gherkin scenarios remain tracked alongside the
// other portal-hoteles E2E specs and will fail-loud the moment the feature
// is implemented (these tests will need real assertions then).

test.describe('Portal Hoteles — discounts management (NOT YET IMPLEMENTED)', () => {
  test.skip('TODO: lists active and expired discounts — discounts.feature @smoke @lista', () => {
    // Given que soy un administrador con acceso al módulo de descuentos
    // When abro la sección de descuentos y promociones
    // Then veo los descuentos activos y vencidos
  });

  test.skip('TODO: creates a valid discount for a property — discounts.feature @happy-path @crear', () => {
    // Given que tengo una propiedad con descuento habilitado
    // When creo un descuento con datos válidos
    // Then el descuento se guarda y queda disponible para usar
  });

  test.skip('TODO: applies a discount to an eligible rate — discounts.feature @happy-path @aplicar', () => {
    // Given que existe una tarifa elegible para descuento
    // When aplico el descuento a esa tarifa
    // Then veo el precio actualizado con la promoción aplicada
  });

  test.skip('TODO: toggles a discount between active and inactive — discounts.feature @happy-path @estado', () => {
    // Given que tengo un descuento guardado
    // When cambio su estado entre activo e inactivo
    // Then el sistema refleja correctamente el nuevo estado
  });
});
