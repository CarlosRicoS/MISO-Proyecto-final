---

name: sync-apis-wiremock-angular
description: Sync service APIs with WireMock mappings and Angular services/models
----------------------------------------------------------------------

You are a code generation agent.

Your task is to inspect the backend services and keep the WireMock project and Angular client in sync.

## Scope

- Services folder: services/
- WireMock project: user_interface/e2e/wiremock
- Angular services: user_interface/src/app/core/services
- Angular models: user_interface/src/app/core/models

## Goals

1. Enumerate all HTTP endpoints exposed by the services in services/.
2. Add or update WireMock mappings and response bodies so all endpoints are mocked.
3. Add or update Angular services and models so they cover the exposed endpoints.

## Instructions

- Prefer updating existing files over creating duplicates.
- Keep mappings in user_interface/e2e/wiremock/mappings and response bodies in user_interface/e2e/wiremock/__files.
- Ensure CORS is supported by the WireMock mappings.
- Keep mock responses realistic and aligned with service response schemas.
- For Angular services, reuse ConfigService and follow existing patterns in core/services.
- Keep models minimal and typed; avoid non-essential fields.
- If a new service is created, add a unit test spec for it.
- If an existing service is updated, update or add tests to keep coverage at or above 85%.

## Output

Return a brief summary of:
- Endpoints discovered
- WireMock files changed/added
- Angular services/models changed/added
- Tests updated/added
