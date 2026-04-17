#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ------------------------------------------------------------------
# Pre-flight: check .env exists
# ------------------------------------------------------------------
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    error "docker/.env not found. Copy .env.example and fill in your credentials:"
    error "  cp docker/.env.example docker/.env"
    exit 1
fi

# ------------------------------------------------------------------
# Step 1: Build Java JARs (required before docker build)
# ------------------------------------------------------------------
info "Building Java JARs..."
for svc in poc_properties billing stripe_mock; do
    info "  Building $svc..."
    (cd "$ROOT_DIR/services/$svc" && ./mvnw clean install -DskipTests -q)
done
info "Java builds complete."

# ------------------------------------------------------------------
# Step 2: Build and start all services
# ------------------------------------------------------------------
cd "$SCRIPT_DIR"

info "Building Docker images..."
docker compose build

info "Starting all services..."
docker compose up -d

# ------------------------------------------------------------------
# Step 3: Wait for DB-backed services to be healthy
# ------------------------------------------------------------------
info "Waiting for services to be healthy..."

wait_for_healthy() {
    local service=$1
    local retries=0
    local max_retries=90
    while true; do
        if docker compose ps "$service" 2>/dev/null | grep -q "(healthy)"; then
            info "  $service is healthy."
            return 0
        fi
        retries=$((retries + 1))
        if [ "$retries" -ge "$max_retries" ]; then
            warn "$service did not become healthy after ${max_retries}s. Check: docker compose logs $service"
            return 1
        fi
        sleep 2
    done
}

wait_for_healthy poc-properties
wait_for_healthy pricing-engine
wait_for_healthy booking
wait_for_healthy billing

# ------------------------------------------------------------------
# Step 4: Seed databases
# ------------------------------------------------------------------
info "Seeding databases..."

info "  Seeding poc_properties..."
docker compose exec -T postgres psql -U postgres -d poc_properties \
    < "$ROOT_DIR/db/seeds/poc-properties/001_seed_properties_data.sql"

info "  Seeding PricingRuleDB..."
docker compose exec -T postgres psql -U postgres -d "PricingRuleDB" \
    < "$ROOT_DIR/db/seeds/pricing-engine/001_seed_pricing_data.sql"

info "Database seeding complete."

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
echo ""
info "=========================================="
info " All services are up!"
info "=========================================="
echo ""
echo "  Gateway:      http://localhost:8080"
echo "  Frontend:     http://localhost:4200"
echo "  PostgreSQL:   localhost:5432"
echo ""
