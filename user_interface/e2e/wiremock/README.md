# WireMock for UI E2E

This WireMock setup mocks the HTTP APIs consumed by the Angular services in src/app/core/services.

## Run

1. cd user_interface/e2e/wiremock
2. docker compose up -d

WireMock listens on http://localhost:8080.

## Run with Podman

If you prefer Podman, use one of the following:

Option A (podman-compose installed):

1. cd user_interface/e2e/wiremock
2. podman-compose -f podman-compose.yml up -d

Option B (podman only):

1. cd user_interface/e2e/wiremock
2. podman run -d --name wiremock -p 8080:8080 \
	-v "$(pwd)/mappings:/home/wiremock/mappings:ro" \
	-v "$(pwd)/__files:/home/wiremock/__files:ro" \
	docker.io/wiremock/wiremock:3.9.1 \
	--verbose --disable-gzip

To stop (podman only):

podman rm -f wiremock

To stop (podman-compose):

podman-compose -f podman-compose.yml down

## Point the UI to WireMock

The UI reads API base URL from assets/config.json generated at runtime. Use env vars:

- API_BASE_URL=http://localhost:8080
- PROPERTY_API_PATH=/poc-properties/api/property (optional, default used)
- PROPERTY_API_TOKEN= (optional)

Example:

API_BASE_URL=http://localhost:8080 npm run start

Or run Playwright with the app:

API_BASE_URL=http://localhost:8080 npm run e2e:web:with-app

## Stop

docker compose down
