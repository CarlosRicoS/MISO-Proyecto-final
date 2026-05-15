import { test } from '@playwright/test';

// Gherkin: occupancy-report.feature — "Generación de Reportes de Ocupación"
//
// The portal-hoteles /reports page currently only renders the *revenue*
// report (incomings_report service: dashboard-metrics, revenue-overview,
// incoming, incoming/csv). There is no daily-occupancy report UI yet, and
// the backend does not expose an /api/reports/occupancy endpoint.
//
// Skipped with TODOs so the scenario stays tracked.

test.describe('Portal Hoteles — occupancy report (NOT YET IMPLEMENTED)', () => {
  test.skip('TODO: shows daily hotel occupancy for the selected period — occupancy-report.feature @ocupacion @diaria @feliz', () => {
    // Given que soy un gerente con acceso al reporte de ocupación
    // When consulto el reporte para un periodo específico
    // Then veo la ocupación diaria del hotel
  });
});
