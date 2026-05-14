import { test } from '@playwright/test';

// Gherkin: dynamic-rules.feature — "Motor de Reglas Dinámicas para Descuentos Automáticos"
//
// The portal-hoteles project does not yet expose a UI to configure dynamic
// pricing rules. The pricing-configuration page only renders a static
// seasonal-rules table built from hard-coded values inside the component
// (see buildSeasonalRuleRows() in pricing-configuration.page.ts) — there is
// no create/activate/persist flow wired to a backend.
//
// All scenarios are skipped with TODOs so they are tracked here.

test.describe('Portal Hoteles — dynamic pricing rules (NOT YET IMPLEMENTED)', () => {
  test.skip('TODO: configures a new dynamic rule with valid values — dynamic-rules.feature @ruta-happy @configuracion', () => {
    // Given que soy un administrador autenticado
    // When configuro una nueva regla dinámica con valores válidos
    // Then la regla se guarda y queda disponible para aplicarse
  });

  test.skip('TODO: activates an inactive dynamic rule and persists its state — dynamic-rules.feature @activacion @happy-path', () => {
    // Given que existe una regla dinámica inactiva
    // When la activo desde el módulo de configuración
    // Then la regla queda guardada como activa
  });
});
