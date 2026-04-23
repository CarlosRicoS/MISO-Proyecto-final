#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$ROOT_DIR/test_result"
THRESHOLD=80
ANDROID_REQUIRED_JDK_MAJOR=21

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$RESULTS_DIR"
find "$RESULTS_DIR" -mindepth 1 -exec rm -rf {} +

declare -a RESULT_ROWS
declare -a E2E_ROWS
CURRENT_STEP=0
TOTAL_STEPS=0

log_step() {
  local message="$1"
  printf "%b[STEP] %s%b\n" "$CYAN" "$message" "$NC" >&2
}

print_failure_log() {
  local label="$1"
  local log_file="$2"
  printf "%b[ERROR] %s failed. Showing last log lines from %s%b\n" "$RED" "$label" "$log_file" "$NC" >&2
  if [[ -f "$log_file" ]]; then
    tail -n 60 "$log_file" >&2
  fi
}

run_with_spinner() {
  local label="$1"
  shift

  local frames=('|' '/' '-' '\\')
  local i=0

  "$@" &
  local pid=$!

  while kill -0 "$pid" 2>/dev/null; do
    printf "\r%b[STEP %d/%d] %s %s%b" "$CYAN" "$CURRENT_STEP" "$TOTAL_STEPS" "$label" "${frames[i % ${#frames[@]}]}" "$NC" >&2
    i=$((i + 1))
    sleep 0.1
  done

  wait "$pid"
  local exit_code=$?

  if [[ "$exit_code" -eq 0 ]]; then
    printf "\r%b[STEP %d/%d] %s done%b\n" "$CYAN" "$CURRENT_STEP" "$TOTAL_STEPS" "$label" "$NC" >&2
  else
    printf "\r%b[STEP %d/%d] %s failed%b\n" "$CYAN" "$CURRENT_STEP" "$TOTAL_STEPS" "$label" "$NC" >&2
  fi

  return "$exit_code"
}

add_result_row() {
  local group="$1"
  local project="$2"
  local coverage="$3"
  local total_tests="$4"
  local total_lines="$5"
  local base_color="$6"
  RESULT_ROWS+=("$group|$project|$coverage|$total_tests|$total_lines|$base_color")
}

add_e2e_row() {
  local group="$1"
  local project="$2"
  local status="$3"
  local total="$4"
  local passed="$5"
  local failed="$6"
  local skipped="$7"
  local duration="$8"
  local base_color="$9"
  E2E_ROWS+=("$group|$project|$status|$total|$passed|$failed|$skipped|$duration|$base_color")
}

to_percent_from_rate() {
  local rate="$1"
  awk -v r="$rate" 'BEGIN { printf "%.2f", (r + 0) * 100 }'
}

is_below_threshold() {
  local value="$1"
  awk -v v="$value" -v t="$THRESHOLD" 'BEGIN { exit !((v + 0) < (t + 0)) }'
}

format_duration() {
  local seconds="$1"
  if [[ "$seconds" -lt 60 ]]; then
    printf "%ss" "$seconds"
    return
  fi

  local mins=$((seconds / 60))
  local rem=$((seconds % 60))
  printf "%sm%ss" "$mins" "$rem"
}

get_java_major_from_home() {
  local java_home="$1"
  if [[ -z "$java_home" ]] || [[ ! -x "$java_home/bin/java" ]]; then
    echo "0"
    return
  fi

  "$java_home/bin/java" -version 2>&1 | awk -F '[".]' '/version/ {
    if ($2 == "1") {
      print $3
    } else {
      print $2
    }
  }' | head -n 1
}

ensure_android_jdk() {
  local required_major="$ANDROID_REQUIRED_JDK_MAJOR"
  local local_jdk
  local detected_major

  local_jdk="$(find "$HOME/.local/jdks" -maxdepth 1 -type d -name "jdk-${required_major}*" 2>/dev/null | head -n 1)"
  if [[ -n "$local_jdk" ]]; then
    echo "$local_jdk"
    return
  fi

  if [[ -n "${JAVA_HOME:-}" ]]; then
    detected_major="$(get_java_major_from_home "$JAVA_HOME")"
    if [[ "$detected_major" == "$required_major" ]]; then
      echo "$JAVA_HOME"
      return
    fi
  fi

  mkdir -p "$HOME/.local/jdks"
  local jdk_tar="$HOME/.local/jdks/openjdk${required_major}.tar.gz"
  log_step "Android tests require JDK ${required_major}; installing local Temurin JDK ${required_major}"

  if [[ ! -f "$jdk_tar" ]]; then
    if ! wget -O "$jdk_tar" "https://api.adoptium.net/v3/binary/latest/${required_major}/ga/linux/x64/jdk/hotspot/normal/eclipse" >/dev/null 2>&1; then
      echo ""
      return
    fi
  fi

  if ! tar -xzf "$jdk_tar" -C "$HOME/.local/jdks" >/dev/null 2>&1; then
    echo ""
    return
  fi

  local_jdk="$(find "$HOME/.local/jdks" -maxdepth 1 -type d -name "jdk-${required_major}*" 2>/dev/null | head -n 1)"
  echo "$local_jdk"
}

extract_branch_rate_from_xml() {
  local xml_file="$1"
  if [[ ! -f "$xml_file" ]]; then
    echo "0.00"
    return
  fi

  local branch_rate
  branch_rate="$(grep -o 'branch-rate="[0-9.]*"' "$xml_file" | head -n 1 | cut -d'"' -f2)"

  if [[ -z "$branch_rate" ]]; then
    echo "0.00"
    return
  fi

  to_percent_from_rate "$branch_rate"
}

extract_lines_valid_from_xml() {
  local xml_file="$1"
  if [[ ! -f "$xml_file" ]]; then
    echo "0"
    return
  fi

  local lines_valid
  lines_valid="$(grep -o 'lines-valid="[0-9]*"' "$xml_file" | head -n 1 | cut -d'"' -f2)"
  [[ -n "$lines_valid" ]] || lines_valid="0"
  echo "$lines_valid"
}

extract_lcov_branch_coverage() {
  local lcov_file="$1"
  if [[ ! -f "$lcov_file" ]]; then
    echo "0.00"
    return
  fi

  awk -F: '
    /^BRF:/ { total += $2 }
    /^BRH:/ { hit += $2 }
    END {
      if (total > 0) {
        printf "%.2f", (hit / total) * 100
      } else {
        printf "0.00"
      }
    }
  ' "$lcov_file"
}

extract_branch_from_karma_log() {
  local log_file="$1"
  if [[ ! -f "$log_file" ]]; then
    echo "0.00"
    return
  fi

  local branch_pct
  branch_pct="$(grep -E 'Branches[[:space:]]*:' "$log_file" | tail -n 1 | sed -E 's/.*:[[:space:]]*([0-9]+(\.[0-9]+)?)%.*/\1/')"

  if [[ -z "$branch_pct" ]]; then
    echo "0.00"
    return
  fi

  awk -v b="$branch_pct" 'BEGIN { printf "%.2f", b + 0 }'
}

extract_lines_total_from_karma_log() {
  local log_file="$1"
  if [[ ! -f "$log_file" ]]; then
    echo "0"
    return
  fi

  local lines_total
  lines_total="$(grep -E 'Lines[[:space:]]*:' "$log_file" | tail -n 1 | sed -E 's/.*\([[:space:]]*[0-9]+\/([0-9]+)[[:space:]]*\).*/\1/')"
  if ! [[ "$lines_total" =~ ^[0-9]+$ ]]; then
    echo "0"
    return
  fi

  echo "$lines_total"
}

parse_karma_total_tests() {
  local log_file="$1"
  if [[ ! -f "$log_file" ]]; then
    echo "0"
    return
  fi

  local total
  total="$(grep -Eo 'Executed [0-9]+ of [0-9]+' "$log_file" | tail -n 1 | awk '{print $4}')"
  [[ -n "$total" ]] || total="0"
  echo "$total"
}

parse_pytest_total_tests() {
  local log_file="$1"
  if [[ ! -f "$log_file" ]]; then
    echo "0"
    return
  fi

  local summary
  summary="$(grep -E '[0-9]+ (passed|failed|skipped|error|errors|xfailed|xpassed)' "$log_file" | tail -n 1)"
  if [[ -z "$summary" ]]; then
    echo "0"
    return
  fi

  echo "$summary" | awk '
    {
      total = 0
      for (i = 1; i <= NF; i++) {
        gsub(/,/, "", $i)
        if ($i ~ /^[0-9]+$/ && (i + 1) <= NF) {
          nextWord = $(i + 1)
          gsub(/,/, "", nextWord)
          if (nextWord ~ /^(passed|failed|skipped|error|errors|xfailed|xpassed)$/) {
            total += $i
          }
        }
      }
      print total
    }
  '
}

parse_dotnet_total_tests() {
  local log_file="$1"
  if [[ ! -f "$log_file" ]]; then
    echo "0"
    return
  fi

  local total
  total="$(grep -Eo 'Total:[[:space:]]+[0-9]+' "$log_file" | tail -n 1 | awk '{print $2}')"
  [[ -n "$total" ]] || total="0"
  echo "$total"
}

parse_surefire_total_tests() {
  local reports_dir="$1"
  if [[ ! -d "$reports_dir" ]]; then
    echo "0"
    return
  fi

  local total
  total="$(grep -h -o 'tests="[0-9]*"' "$reports_dir"/TEST-*.xml 2>/dev/null | cut -d'"' -f2 | awk '{s+=$1} END {print s+0}')"
  [[ -n "$total" ]] || total="0"
  echo "$total"
}

render_row() {
  local group="$1"
  local project="$2"
  local coverage="$3"
  local total_tests="$4"
  local total_lines="$5"
  local base_color="$6"

  local status="PASS"
  local row_color="$base_color"
  local coverage_display="${coverage}%"

  if [[ "$coverage" == "Error" ]]; then
    status="ERROR"
    row_color="$RED"
    coverage_display="Error"
    printf "%b%-16s %-26s %10s %12s %12s %8s%b\n" "$row_color" "$group" "$project" "$coverage_display" "$total_tests" "$total_lines" "$status" "$NC"
    return
  fi

  if is_below_threshold "$coverage"; then
    status="FAIL"
    row_color="$RED"
  fi

  printf "%b%-16s %-26s %10s %12s %12s %8s%b\n" "$row_color" "$group" "$project" "$coverage_display" "$total_tests" "$total_lines" "$status" "$NC"
}

render_e2e_row() {
  local group="$1"
  local project="$2"
  local status="$3"
  local total="$4"
  local passed="$5"
  local failed="$6"
  local skipped="$7"
  local duration="$8"
  local base_color="$9"

  local row_color="$base_color"
  if [[ "$status" != "PASS" ]] || [[ "$failed" != "0" ]]; then
    row_color="$RED"
  fi

  printf "%b%-16s %-20s %8s %8s %8s %8s %10s %8s%b\n" \
    "$row_color" "$group" "$project" "$total" "$passed" "$failed" "$skipped" "$duration" "$status" "$NC"
}

run_user_interface_coverage() {
  local project_dir="$ROOT_DIR/user_interface"
  local project_tmp_dir="$RESULTS_DIR/user_interface"
  local log_file="$project_tmp_dir/test.log"

  mkdir -p "$project_tmp_dir"

  if [[ ! -f "$project_dir/package.json" ]]; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] user_interface/travelhub has no package.json"
    echo "0.00|0|0"
    return
  fi

  if ! find "$project_dir/src" -type f -name "*.spec.ts" 2>/dev/null | grep -q .; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] user_interface/travelhub has no unit tests"
    echo "0.00|0|0"
    return
  fi

  rm -f "$project_dir/coverage/app/lcov.info"

  if ! run_with_spinner "user_interface/travelhub" bash -c '
    set -e
    cd "$1"
    npm ci >"$2" 2> >(tee -a "$2" >&2)
    npx ng test --watch=false --browsers=ChromeHeadless --no-progress --code-coverage --include="src/**/*.spec.ts" >>"$2" 2> >(tee -a "$2" >&2)
  ' _ "$project_dir" "$log_file"; then
    log_step "user_interface/travelhub failed (see $log_file)"
    print_failure_log "user_interface/travelhub" "$log_file"
    echo "Error|$(parse_karma_total_tests "$log_file")|$(extract_lines_total_from_karma_log "$log_file")"
    return
  fi

  local lcov_file="$project_dir/coverage/app/lcov.info"
  local total_tests total_lines branch_cov
  total_tests="$(parse_karma_total_tests "$log_file")"

  if [[ -f "$lcov_file" ]]; then
    branch_cov="$(extract_lcov_branch_coverage "$lcov_file")"
    total_lines="$(awk -F: '/^LF:/ { total += $2 } END { print total + 0 }' "$lcov_file")"
    echo "$branch_cov|$total_tests|$total_lines"
    return
  fi

  branch_cov="$(extract_branch_from_karma_log "$log_file")"
  total_lines="$(extract_lines_total_from_karma_log "$log_file")"
  echo "$branch_cov|$total_tests|$total_lines"
}

parse_playwright_metrics() {
  local log_file="$1"
  local total="$2"
  local passed="0"
  local failed="0"
  local skipped="0"

  passed="$(grep -Eo '[0-9]+ passed' "$log_file" | tail -n 1 | awk '{print $1}')"
  failed="$(grep -Eo '[0-9]+ failed' "$log_file" | tail -n 1 | awk '{print $1}')"
  skipped="$(grep -Eo '[0-9]+ skipped' "$log_file" | tail -n 1 | awk '{print $1}')"

  [[ -n "$passed" ]] || passed="0"
  [[ -n "$failed" ]] || failed="0"
  [[ -n "$skipped" ]] || skipped="0"

  if [[ "$total" == "0" ]]; then
    total=$((passed + failed + skipped))
  fi

  printf "%s|%s|%s|%s" "$total" "$passed" "$failed" "$skipped"
}

parse_android_metrics() {
  local log_file="$1"
  local total="0"
  local failed="0"
  local passed="0"
  local skipped="0"

  local gradle_line
  gradle_line="$(grep -E '[0-9]+ tests? completed, [0-9]+ failed' "$log_file" | tail -n 1)"
  if [[ -n "$gradle_line" ]]; then
    total="$(echo "$gradle_line" | sed -E 's/.*([0-9]+) tests? completed, ([0-9]+) failed.*/\1/')"
    failed="$(echo "$gradle_line" | sed -E 's/.*([0-9]+) tests? completed, ([0-9]+) failed.*/\2/')"
    passed=$((total - failed))
  fi

  printf "%s|%s|%s|%s" "$total" "$passed" "$failed" "$skipped"
}

detect_android_sdk_path() {
  if [[ -n "${ANDROID_HOME:-}" ]] && [[ -d "${ANDROID_HOME}" ]]; then
    echo "$ANDROID_HOME"
    return
  fi

  if [[ -n "${ANDROID_SDK_ROOT:-}" ]] && [[ -d "${ANDROID_SDK_ROOT}" ]]; then
    echo "$ANDROID_SDK_ROOT"
    return
  fi

  if [[ -d "$HOME/Android/Sdk" ]]; then
    echo "$HOME/Android/Sdk"
    return
  fi

  echo ""
}

ensure_android_sdk_config() {
  local project_dir="$1"
  local sdk_path
  sdk_path="$(detect_android_sdk_path)"

  if [[ -z "$sdk_path" ]]; then
    return 1
  fi

  export ANDROID_HOME="$sdk_path"
  export ANDROID_SDK_ROOT="$sdk_path"
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

  local local_properties="$project_dir/android/local.properties"
  printf "sdk.dir=%s\n" "$sdk_path" > "$local_properties"
  return 0
}

ensure_android_device_ready() {
  local sdk_path="$1"
  local adb_bin="$sdk_path/platform-tools/adb"
  local emulator_bin="$sdk_path/emulator/emulator"

  if [[ ! -x "$adb_bin" ]]; then
    return 1
  fi

  local connected
  connected="$($adb_bin devices | awk 'NR>1 && $2=="device" {print $1}' | head -n 1)"
  if [[ -n "$connected" ]]; then
    return 0
  fi

  if [[ ! -x "$emulator_bin" ]]; then
    return 1
  fi

  local avd_name
  avd_name="$($emulator_bin -list-avds | head -n 1)"
  if [[ -z "$avd_name" ]]; then
    return 1
  fi

  log_step "No Android device connected; starting emulator $avd_name"
  nohup "$emulator_bin" -avd "$avd_name" -no-window -no-audio -no-boot-anim >/dev/null 2>&1 &

  "$adb_bin" wait-for-device >/dev/null 2>&1 || return 1

  local max_wait=180
  local waited=0
  while [[ "$waited" -lt "$max_wait" ]]; do
    if [[ "$($adb_bin shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  return 1
}

run_user_interface_e2e_web() {
  local project_dir="$ROOT_DIR/user_interface"
  local project_tmp_dir="$RESULTS_DIR/user_interface_e2e_web"
  local log_file="$project_tmp_dir/test.log"
  local started_at ended_at elapsed total detected_total metrics

  mkdir -p "$project_tmp_dir"

  if [[ ! -d "$project_dir/e2e/web" ]]; then
    echo "ERROR|0|0|0|0|0s"
    return
  fi

  started_at=$(date +%s)
  if ! run_with_spinner "user_interface/e2e-web" bash -c '
    set -e
    cd "$1"
    npm run e2e:web:with-app >"$2" 2> >(tee -a "$2" >&2)
  ' _ "$project_dir" "$log_file"; then
    ended_at=$(date +%s)
    elapsed=$((ended_at - started_at))
    metrics="$(parse_playwright_metrics "$log_file" "0")"
    print_failure_log "user_interface/e2e-web" "$log_file"
    echo "ERROR|${metrics}|$(format_duration "$elapsed")"
    return
  fi

  ended_at=$(date +%s)
  elapsed=$((ended_at - started_at))

  detected_total="$(grep -Eo 'Running [0-9]+ tests?' "$log_file" | tail -n 1 | awk '{print $2}')"
  [[ -n "$detected_total" ]] || detected_total="0"
  metrics="$(parse_playwright_metrics "$log_file" "$detected_total")"
  echo "PASS|${metrics}|$(format_duration "$elapsed")"
}

run_user_interface_e2e_android() {
  local project_dir="$ROOT_DIR/user_interface"
  local project_tmp_dir="$RESULTS_DIR/user_interface_e2e_android"
  local log_file="$project_tmp_dir/test.log"
  local started_at ended_at elapsed metrics
  local android_jdk_home
  local android_sdk_path

  mkdir -p "$project_tmp_dir"

  if [[ ! -d "$project_dir/e2e/android" ]]; then
    echo "ERROR|0|0|0|0|0s"
    return
  fi

  android_jdk_home="$(ensure_android_jdk)"
  if [[ -z "$android_jdk_home" ]]; then
    log_step "Could not install or detect JDK ${ANDROID_REQUIRED_JDK_MAJOR} for Android tests"
    echo "ERROR|0|0|0|0|0s"
    return
  fi

  if ! ensure_android_sdk_config "$project_dir"; then
    log_step "Android SDK not found. Set ANDROID_HOME/ANDROID_SDK_ROOT or install SDK at $HOME/Android/Sdk"
    echo "ERROR|0|0|0|0|0s"
    return
  fi

  android_sdk_path="${ANDROID_HOME}"
  if ! ensure_android_device_ready "$android_sdk_path"; then
    log_step "No ready Android device/emulator found for instrumentation tests"
    echo "ERROR|0|0|0|0|0s"
    return
  fi

  started_at=$(date +%s)
  if ! run_with_spinner "user_interface/e2e-android" bash -c '
    set -e
    cd "$1"
    JAVA_HOME="$3" ANDROID_HOME="$4" ANDROID_SDK_ROOT="$4" PATH="$3/bin:$4/platform-tools:$4/emulator:$PATH" npm run e2e:android >"$2" 2> >(tee -a "$2" >&2)
  ' _ "$project_dir" "$log_file" "$android_jdk_home" "$android_sdk_path"; then
    ended_at=$(date +%s)
    elapsed=$((ended_at - started_at))
    metrics="$(parse_android_metrics "$log_file")"
    print_failure_log "user_interface/e2e-android" "$log_file"
    echo "ERROR|${metrics}|$(format_duration "$elapsed")"
    return
  fi

  ended_at=$(date +%s)
  elapsed=$((ended_at - started_at))
  metrics="$(parse_android_metrics "$log_file")"
  echo "PASS|${metrics}|$(format_duration "$elapsed")"
}

run_python_service_coverage() {
  local service_name="$1"
  local service_dir="$2"
  local project_tmp_dir="$RESULTS_DIR/$service_name"
  local log_file="$project_tmp_dir/test.log"
  local xml_file="$project_tmp_dir/coverage.xml"
  local cov_target="$service_name"

  mkdir -p "$project_tmp_dir"

  if [[ ! -d "$service_dir/tests" ]] || ! find "$service_dir/tests" -type f 2>/dev/null | grep -q .; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] services/$service_name has no unit tests"
    echo "0.00|0|0"
    return
  fi

  case "$service_name" in
    auth|pms)
      cov_target="main"
      ;;
    booking)
      cov_target="booking"
      ;;
    booking_orchestrator)
      cov_target="booking_orchestrator"
      ;;
    notifications)
      cov_target="notifications"
      ;;
  esac

  rm -f "$xml_file"

  if ! run_with_spinner "services/$service_name" bash -c '
    set -e
    cd "$1"
    uv sync --group dev >"$2" 2> >(tee -a "$2" >&2)
    uv run pytest tests/ -q \
      --override-ini=addopts= \
      --cov="$3" \
      --cov-branch \
      --cov-report=xml:"$4" \
      --cov-fail-under=0 >>"$2" 2> >(tee -a "$2" >&2)
  ' _ "$service_dir" "$log_file" "$cov_target" "$xml_file"; then
    log_step "services/$service_name failed (see $log_file)"
    print_failure_log "services/$service_name" "$log_file"
    echo "Error|$(parse_pytest_total_tests "$log_file")|$(extract_lines_valid_from_xml "$xml_file")"
    return
  fi

  echo "$(extract_branch_rate_from_xml "$xml_file")|$(parse_pytest_total_tests "$log_file")|$(extract_lines_valid_from_xml "$xml_file")"
}

run_java_service_coverage() {
  local service_name="$1"
  local service_dir="$2"
  local project_tmp_dir="$RESULTS_DIR/$service_name"
  local log_file="$project_tmp_dir/test.log"
  local jacoco_csv="$service_dir/target/site/jacoco/jacoco.csv"
  local surefire_reports_dir="$service_dir/target/surefire-reports"
  local java25_home
  local java_runner

  mkdir -p "$project_tmp_dir"

  java25_home="$(find "$HOME/.local/jdks" -maxdepth 1 -type d -name 'jdk-25*' 2>/dev/null | head -n 1)"
  if [[ -n "$java25_home" ]]; then
    java_runner="JAVA_HOME=\"$java25_home\" PATH=\"$java25_home/bin:$PATH\" ./mvnw clean test"
  else
    java_runner="./mvnw clean test"
  fi

  if [[ ! -d "$service_dir/src/test" ]] || ! find "$service_dir/src/test" -type f 2>/dev/null | grep -q .; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] services/$service_name has no unit tests"
    echo "0.00|0|0"
    return
  fi

  rm -f "$jacoco_csv"

  if ! run_with_spinner "services/$service_name" bash -c '
    set -e
    cd "$1"
    eval "$3" >"$2" 2> >(tee -a "$2" >&2)
  ' _ "$service_dir" "$log_file" "$java_runner"; then
    log_step "services/$service_name failed (see $log_file)"
    print_failure_log "services/$service_name" "$log_file"
    echo "Error|$(parse_surefire_total_tests "$surefire_reports_dir")|0"
    return
  fi

  if [[ ! -f "$jacoco_csv" ]]; then
    echo "0.00|$(parse_surefire_total_tests "$surefire_reports_dir")|0"
    return
  fi

  local branch_cov total_lines total_tests
  branch_cov="$(awk -F, '
    NR > 1 {
      missed += $6
      covered += $7
    }
    END {
      total = missed + covered
      if (total > 0) {
        printf "%.2f", (covered / total) * 100
      } else {
        printf "0.00"
      }
    }
  ' "$jacoco_csv")"

  total_lines="$(awk -F, '
    NR > 1 {
      missed += $8
      covered += $9
    }
    END {
      print missed + covered
    }
  ' "$jacoco_csv")"

  total_tests="$(parse_surefire_total_tests "$surefire_reports_dir")"
  echo "$branch_cov|$total_tests|$total_lines"
}

run_dotnet_service_coverage() {
  local service_name="$1"
  local service_dir="$2"
  local project_tmp_dir="$RESULTS_DIR/$service_name"
  local log_file="$project_tmp_dir/test.log"
  local results_subdir="$project_tmp_dir/dotnet"
  local test_project

  mkdir -p "$results_subdir"

  test_project="$(find "$service_dir" -maxdepth 2 -type f -name "*Tests.csproj" | head -n 1)"
  if [[ -z "$test_project" ]]; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] services/$service_name has no unit tests"
    echo "0.00|0|0"
    return
  fi

  local test_project_dir
  test_project_dir="$(dirname "$test_project")"
  if ! find "$test_project_dir" -type f -name "*.cs" 2>/dev/null | grep -q .; then
    log_step "[STEP $CURRENT_STEP/$TOTAL_STEPS] services/$service_name has no unit tests"
    echo "0.00|0|0"
    return
  fi

  pkill -f "dotnet test $test_project" >/dev/null 2>&1 || true
  find "$results_subdir" -type f -name "coverage.cobertura.xml" -delete 2>/dev/null

  if ! run_with_spinner "services/$service_name" bash -c '
    set -e
    cd "$1"
    dotnet restore "$2" >"$4" 2> >(tee -a "$4" >&2)
    timeout 20m dotnet test "$2" \
      --no-restore \
      --collect:"XPlat Code Coverage" \
      --results-directory "$3" \
      --blame-hang \
      --blame-hang-timeout 5m >>"$4" 2> >(tee -a "$4" >&2)
  ' _ "$service_dir" "$test_project" "$results_subdir" "$log_file"; then
    log_step "services/$service_name failed (see $log_file)"
    print_failure_log "services/$service_name" "$log_file"
    echo "Error|$(parse_dotnet_total_tests "$log_file")|0"
    return
  fi

  local cobertura_xml
  cobertura_xml="$(find "$results_subdir" -type f -name "coverage.cobertura.xml" | head -n 1)"

  if [[ -z "$cobertura_xml" ]]; then
    echo "0.00|$(parse_dotnet_total_tests "$log_file")|0"
    return
  fi

  echo "$(extract_branch_rate_from_xml "$cobertura_xml")|$(parse_dotnet_total_tests "$log_file")|$(extract_lines_valid_from_xml "$cobertura_xml")"
}

detect_and_run_service() {
  local service_dir="$1"
  local service_name
  service_name="$(basename "$service_dir")"

  if [[ -f "$service_dir/pyproject.toml" ]]; then
    run_python_service_coverage "$service_name" "$service_dir"
    return
  fi

  if [[ -f "$service_dir/pom.xml" ]]; then
    run_java_service_coverage "$service_name" "$service_dir"
    return
  fi

  if find "$service_dir" -maxdepth 2 -type f -name "*Tests.csproj" | grep -q .; then
    run_dotnet_service_coverage "$service_name" "$service_dir"
    return
  fi

  echo "0.00|0|0"
}

TOTAL_STEPS=3
for service_dir in "$ROOT_DIR"/services/*; do
  [[ -d "$service_dir" ]] || continue
  TOTAL_STEPS=$((TOTAL_STEPS + 1))
done

log_step "Cleared test_result and starting execution ($TOTAL_STEPS projects)"

CURRENT_STEP=1
ui_coverage_data="$(run_user_interface_coverage)"
IFS='|' read -r ui_coverage ui_total_tests ui_total_lines <<< "$ui_coverage_data"
add_result_row "user_interface" "travelhub" "$ui_coverage" "$ui_total_tests" "$ui_total_lines" "$CYAN"

CURRENT_STEP=2
ui_web_e2e="$(run_user_interface_e2e_web)"
IFS='|' read -r ui_web_status ui_web_total ui_web_passed ui_web_failed ui_web_skipped ui_web_duration <<< "$ui_web_e2e"
add_e2e_row "user_interface" "travelhub-web" "$ui_web_status" "$ui_web_total" "$ui_web_passed" "$ui_web_failed" "$ui_web_skipped" "$ui_web_duration" "$CYAN"

CURRENT_STEP=3
ui_android_e2e="$(run_user_interface_e2e_android)"
IFS='|' read -r ui_android_status ui_android_total ui_android_passed ui_android_failed ui_android_skipped ui_android_duration <<< "$ui_android_e2e"
add_e2e_row "user_interface" "travelhub-android" "$ui_android_status" "$ui_android_total" "$ui_android_passed" "$ui_android_failed" "$ui_android_skipped" "$ui_android_duration" "$CYAN"

for service_dir in "$ROOT_DIR"/services/*; do
  [[ -d "$service_dir" ]] || continue
  CURRENT_STEP=$((CURRENT_STEP + 1))
  service_name="$(basename "$service_dir")"
  service_coverage_data="$(detect_and_run_service "$service_dir")"
  IFS='|' read -r service_coverage service_total_tests service_total_lines <<< "$service_coverage_data"
  add_result_row "services" "$service_name" "$service_coverage" "$service_total_tests" "$service_total_lines" "$GREEN"
done

printf "\nBranch coverage gate: %s%%\n\n" "$THRESHOLD"
printf "%-16s %-26s %10s %12s %12s %8s\n" "GROUP" "PROJECT" "BRANCH" "TOTAL_TESTS" "TOTAL_LINES" "STATUS"
printf "%-16s %-26s %10s %12s %12s %8s\n" "-----" "-------" "------" "-----------" "-----------" "------"

for row in "${RESULT_ROWS[@]}"; do
  IFS='|' read -r row_group row_project row_coverage row_total_tests row_total_lines row_color <<< "$row"
  render_row "$row_group" "$row_project" "$row_coverage" "$row_total_tests" "$row_total_lines" "$row_color"
done

printf "\nE2E execution summary\n\n"
printf "%-16s %-20s %8s %8s %8s %8s %10s %8s\n" "GROUP" "PROJECT" "TOTAL" "PASSED" "FAILED" "SKIPPED" "DURATION" "STATUS"
printf "%-16s %-20s %8s %8s %8s %8s %10s %8s\n" "-----" "-------" "-----" "------" "------" "-------" "--------" "------"

for row in "${E2E_ROWS[@]}"; do
  IFS='|' read -r row_group row_project row_status row_total row_passed row_failed row_skipped row_duration row_color <<< "$row"
  render_e2e_row "$row_group" "$row_project" "$row_status" "$row_total" "$row_passed" "$row_failed" "$row_skipped" "$row_duration" "$row_color"
done

printf "\nDetailed logs and raw outputs were written to: %s\n" "$RESULTS_DIR"
