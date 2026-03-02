#!/bin/bash
# Property Search Load Test Runner
# Run from load-tests/ directory. Pass BASE_URL (API Gateway invoke URL) and optional params.
#
# Usage:
#   ./run_property_load_tests.sh
#   BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com ./run_property_load_tests.sh
#   BASE_URL=https://xxx.amazonaws.com SEARCH_THREADS=400 ./run_property_load_tests.sh
#
# Experiment scenarios:
#   Scenario A (150 users, 600ms target): SEARCH_THREADS=150 SEARCH_DURATION=300
#   Scenario B (400 users, 800ms target): SEARCH_THREADS=400 SEARCH_DURATION=300
#   Scenario C (50→200 searches/min): Ramp over ~3 min - use SEARCH_RAMPUP=180

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configurable parameters (override via env)
BASE_URL="${BASE_URL:-https://xn7t7iadi0.execute-api.us-east-1.amazonaws.com}"
SEARCH_THREADS="${SEARCH_THREADS:-1}"
SEARCH_RAMPUP="${SEARCH_RAMPUP:-60}"
SEARCH_DURATION="${SEARCH_DURATION:-120}"
LOCK_THREADS="${LOCK_THREADS:-1}"
LOCK_RAMPUP="${LOCK_RAMPUP:-30}"
LOCK_DURATION="${LOCK_DURATION:-120}"
JMETER_HOME="${JMETER_HOME:-$HOME/programs/apache-jmeter-5.6.3}"
JMETER_PLAN="${JMETER_PLAN:-PropertySearchLoadTest.jmx}"

# Parse BASE_URL into host, protocol, port for JMeter
# e.g. https://abc123.execute-api.us-east-1.amazonaws.com -> host=abc123..., protocol=https, port=443
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
RESULTS_DIR="./results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"
LOG_FILE="$RESULTS_DIR/execution.log"

echo "=== Property Search Load Test ===" | tee "$LOG_FILE"
echo "BASE_URL: $BASE_URL" | tee -a "$LOG_FILE"
echo "BASE_HOST: $BASE_HOST" | tee -a "$LOG_FILE"
echo "Search: ${SEARCH_THREADS} threads, ${SEARCH_RAMPUP}s ramp-up, ${SEARCH_DURATION}s duration" | tee -a "$LOG_FILE"
echo "Lock: ${LOCK_THREADS} threads, ${LOCK_RAMPUP}s ramp-up, ${LOCK_DURATION}s duration" | tee -a "$LOG_FILE"
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
  -Jsearch_threads="$SEARCH_THREADS" \
  -Jsearch_rampup="$SEARCH_RAMPUP" \
  -Jsearch_duration="$SEARCH_DURATION" \
  -Jlock_threads="$LOCK_THREADS" \
  -Jlock_rampup="$LOCK_RAMPUP" \
  -Jlock_duration="$LOCK_DURATION" \
  -e \
  -o "$RESULTS_DIR/report/" 2>&1 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "=== Test complete ===" | tee -a "$LOG_FILE"
echo "HTML Report: $RESULTS_DIR/report/index.html" | tee -a "$LOG_FILE"
echo "Raw results: $RESULTS_DIR/result.jtl" | tee -a "$LOG_FILE"
