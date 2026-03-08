#!/bin/bash
# Pricing Orchestrator Load Test Runner
# Run from load-tests/ directory. Pass BASE_URL (API Gateway invoke URL) and optional params.
#
# Usage:
#   ./run_pricing_orchestrator_load_tests.sh
#   BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com ./run_pricing_orchestrator_load_tests.sh
#   BASE_URL=https://xxx.amazonaws.com PRICING_THREADS=400 ./run_pricing_orchestrator_load_tests.sh
#
# Experiment: "Busqueda y seleccion de propiedades" — Pricing calculation with dynamic discounts
# Endpoint:  GET /pricing-orchestator/property?propertyId=...&guests=...&dateInit=...&dateFinish=...&discountCode=...
#
# ── Phase 1: Proportional Tests (current infra, 8 tasks: 2 orchestrator + 3 properties + 3 engine) ──
#   Scenario A-scaled (38 users,  ≤300ms TTFB): PRICING_THREADS=38  PRICING_RAMPUP=30  PRICING_DURATION=300
#   Scenario B-scaled (100 users, ≤500ms TTFB): PRICING_THREADS=100 PRICING_RAMPUP=60  PRICING_DURATION=300
#   Scenario C-scaled (100 TPM throughput):      PRICING_THREADS=10  PRICING_RAMPUP=15  PRICING_DURATION=300
#
# ── Phase 2: Full Load Tests (find breaking points) ──
#   Scenario A-full (150 users, ≤300ms TTFB): PRICING_THREADS=150 PRICING_RAMPUP=60  PRICING_DURATION=300
#   Scenario B-full (400 users, ≤500ms TTFB): PRICING_THREADS=400 PRICING_RAMPUP=120 PRICING_DURATION=300
#   Scenario C-full (400 TPM throughput):      PRICING_THREADS=40  PRICING_RAMPUP=30  PRICING_DURATION=300

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configurable parameters (override via env)
BASE_URL="${BASE_URL:-https://kmm5lhw92e.execute-api.us-east-1.amazonaws.com}"
PRICING_THREADS="${PRICING_THREADS:-1}"
PRICING_RAMPUP="${PRICING_RAMPUP:-60}"
PRICING_DURATION="${PRICING_DURATION:-120}"
JMETER_HOME="${JMETER_HOME:-$HOME/programs/apache-jmeter-5.6.3}"
JMETER_PLAN="${JMETER_PLAN:-PricingOrchestratorLoadTest.jmx}"

# Parse BASE_URL into host, protocol, port for JMeter
_base_stripped="${BASE_URL#*://}"
BASE_HOST="${_base_stripped%%/*}"
BASE_PROTOCOL="${BASE_URL%%://*}"
if [[ "$BASE_PROTOCOL" == "https" ]]; then
  BASE_PORT="${BASE_PORT:-443}"
else
  BASE_PORT="${BASE_PORT:-80}"
fi

# Results directory
TIMESTAMP=$(date '+%Y_%m_%d_%H_%M_%S')
RESULTS_DIR="./results/pricing_orchestrator_$TIMESTAMP"
mkdir -p "$RESULTS_DIR"
LOG_FILE="$RESULTS_DIR/execution.log"

echo "=== Pricing Orchestrator Load Test ===" | tee "$LOG_FILE"
echo "BASE_URL: $BASE_URL" | tee -a "$LOG_FILE"
echo "BASE_HOST: $BASE_HOST" | tee -a "$LOG_FILE"
echo "Threads: ${PRICING_THREADS}, Ramp-up: ${PRICING_RAMPUP}s, Duration: ${PRICING_DURATION}s" | tee -a "$LOG_FILE"
echo "Results: $RESULTS_DIR" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [[ ! -f "$JMETER_HOME/bin/jmeter" ]]; then
  echo "ERROR: JMeter not found at $JMETER_HOME. Set JMETER_HOME or install JMeter."
  exit 1
fi

if [[ ! -f "$JMETER_PLAN" ]]; then
  echo "ERROR: JMeter plan not found: $JMETER_PLAN"
  exit 1
fi

"$JMETER_HOME/bin/jmeter" -n \
  -t "$JMETER_PLAN" \
  -l "$RESULTS_DIR/result.jtl" \
  -j "$RESULTS_DIR/jmeter.log" \
  -Jbase_url="$BASE_URL" \
  -Jbase_host="$BASE_HOST" \
  -Jbase_protocol="$BASE_PROTOCOL" \
  -Jbase_port="$BASE_PORT" \
  -Jpricing_threads="$PRICING_THREADS" \
  -Jpricing_rampup="$PRICING_RAMPUP" \
  -Jpricing_duration="$PRICING_DURATION" \
  -e \
  -o "$RESULTS_DIR/report/" 2>&1 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "=== Test complete ===" | tee -a "$LOG_FILE"
echo "HTML Report: $RESULTS_DIR/report/index.html" | tee -a "$LOG_FILE"
echo "Raw results: $RESULTS_DIR/result.jtl" | tee -a "$LOG_FILE"
