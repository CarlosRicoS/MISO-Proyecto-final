#!/usr/bin/env bash
set -euo pipefail

# Runs Android Espresso E2E tests after syncing web assets into the Android project.
# Usage:
#   ./scripts/run-android-espresso-tests.sh
#   ./scripts/run-android-espresso-tests.sh --wiremock
#   ./scripts/run-android-espresso-tests.sh --start-emulator
#   ./scripts/run-android-espresso-tests.sh --start-emulator --avd Pixel_7_API_35
#   ./scripts/run-android-espresso-tests.sh --ci --avd Pixel_7_API_35
#   ./scripts/run-android-espresso-tests.sh --class com.uniandes.travelhub.app.TravelHubEspressoTest

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"

USE_WIREMOCK=false
TEST_CLASS=""
START_EMULATOR=false
AVD_NAME=""
ADB_BIN=""
EMULATOR_BIN=""
HEADLESS=false
CI_MODE=false
BOOT_TIMEOUT_SEC=300
EMULATOR_LOG_FILE="/tmp/travelhub-emulator.log"
MIN_SDK=23
TARGET_SERIAL=""
MOCK_API_PORT=8080
MOCK_API_PID=""
EMULATOR_PID=""

cleanup() {
  if [[ -n "$MOCK_API_PID" ]] && kill -0 "$MOCK_API_PID" >/dev/null 2>&1; then
    kill "$MOCK_API_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "$EMULATOR_PID" ]] && kill -0 "$EMULATOR_PID" >/dev/null 2>&1; then
    kill "$EMULATOR_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

resolve_tool() {
  local tool_name="$1"
  local -a candidates=()

  if [[ -n "${ANDROID_HOME:-}" ]]; then
    candidates+=("$ANDROID_HOME")
  fi

  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    candidates+=("$ANDROID_SDK_ROOT")
  fi

  candidates+=("$HOME/Android/Sdk" "/opt/android-sdk")

  for sdk_root in "${candidates[@]}"; do
    if [[ "$tool_name" == "adb" && -x "$sdk_root/platform-tools/adb" ]]; then
      echo "$sdk_root/platform-tools/adb"
      return 0
    fi

    if [[ "$tool_name" == "emulator" && -x "$sdk_root/emulator/emulator" ]]; then
      echo "$sdk_root/emulator/emulator"
      return 0
    fi
  done

  if command -v "$tool_name" >/dev/null 2>&1; then
    command -v "$tool_name"
    return 0
  fi

  return 1
}

has_online_device() {
  "$ADB_BIN" devices | awk 'NR>1 && $2=="device" {found=1} END{exit !found}'
}

first_online_device_serial() {
  "$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1; exit}'
}

emulator_online_serial() {
  "$ADB_BIN" devices | awk 'NR>1 && $1 ~ /^emulator-/ && $2=="device" {print $1; exit}'
}

device_sdk_int() {
  local serial="$1"
  "$ADB_BIN" -s "$serial" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r'
}

wait_for_online_serial() {
  local -r attempts=$((BOOT_TIMEOUT_SEC / 2))
  local i=1

  while (( i <= attempts )); do
    TARGET_SERIAL="$(emulator_online_serial)"
    if [[ -n "$TARGET_SERIAL" ]]; then
      return 0
    fi

    if [[ -n "$EMULATOR_PID" ]] && ! kill -0 "$EMULATOR_PID" >/dev/null 2>&1; then
      echo "Emulator process exited before becoming available."
      echo "Emulator logs: $EMULATOR_LOG_FILE"
      tail -n 120 "$EMULATOR_LOG_FILE" || true
      return 1
    fi

    if (( i % 15 == 0 )); then
      echo "Waiting for emulator adb serial... (${i}/${attempts})"
    fi

    sleep 2
    i=$((i + 1))
  done

  return 1
}

wait_for_boot_complete() {
  local max_attempts=$((BOOT_TIMEOUT_SEC / 5))
  local attempt=1

  while (( attempt <= max_attempts )); do
    if "$ADB_BIN" -s "$TARGET_SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'; then
      return 0
    fi

    echo "Waiting for emulator boot to complete... (${attempt}/${max_attempts})"
    sleep 5
    attempt=$((attempt + 1))
  done

  return 1
}

start_emulator_if_needed() {
  local -a emulator_args=()

  if [[ -z "$EMULATOR_BIN" ]]; then
    echo "emulator command not found. Install Android SDK Emulator and add it to PATH."
    exit 1
  fi

  if [[ -z "$AVD_NAME" ]]; then
    AVD_NAME="$("$EMULATOR_BIN" -list-avds | head -n 1 || true)"
  fi

  if [[ -z "$AVD_NAME" ]]; then
    echo "No AVD found. Create one in Android Studio Device Manager first."
    exit 1
  fi

  if ! "$EMULATOR_BIN" -list-avds | grep -Fxq "$AVD_NAME"; then
    echo "AVD '$AVD_NAME' was not found."
    echo "Available AVDs:"
    "$EMULATOR_BIN" -list-avds
    exit 1
  fi

  emulator_args=(-avd "$AVD_NAME" -no-boot-anim)

  if [[ "$HEADLESS" == "true" ]]; then
    emulator_args+=(-no-window -no-audio -gpu swiftshader_indirect)
  fi

  if [[ "$CI_MODE" == "true" ]]; then
    # CI runs should be deterministic and avoid extra emulator UI/background behavior.
    emulator_args+=(-no-snapshot -no-snapshot-save)
  fi

  echo "Starting emulator AVD '$AVD_NAME'..."
  nohup "$EMULATOR_BIN" "${emulator_args[@]}" >"$EMULATOR_LOG_FILE" 2>&1 &
  EMULATOR_PID=$!

  if ! wait_for_online_serial; then
    echo "Emulator did not register with adb in time."
    echo "Emulator logs: $EMULATOR_LOG_FILE"
    tail -n 120 "$EMULATOR_LOG_FILE" || true
    exit 1
  fi

  echo "Emulator adb serial detected: $TARGET_SERIAL"

  if ! wait_for_boot_complete; then
    echo "Emulator started but did not finish booting in time."
    echo "Emulator logs: $EMULATOR_LOG_FILE"
    tail -n 120 "$EMULATOR_LOG_FILE" || true
    exit 1
  fi
}

optimize_device_for_e2e() {
  # Keep Espresso interactions stable and reduce animation-related flakiness.
  "$ADB_BIN" shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
  "$ADB_BIN" shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
  "$ADB_BIN" shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
}

wait_for_mock_api() {
  local attempts=20
  local i=1

  while (( i <= attempts )); do
    if curl -fsS "http://127.0.0.1:${MOCK_API_PORT}/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done

  return 1
}

ensure_gradle_wrapper() {
  local wrapper_dir="$ANDROID_DIR/gradle/wrapper"
  local wrapper_jar="$wrapper_dir/gradle-wrapper.jar"
  local wrapper_props="$wrapper_dir/gradle-wrapper.properties"
  local gradle_version
  local jar_url

  if [[ -f "$wrapper_jar" ]]; then
    return 0
  fi

  if [[ ! -f "$wrapper_props" ]]; then
    echo "Gradle wrapper properties not found at $wrapper_props"
    exit 1
  fi

  gradle_version="$(sed -n 's|.*gradle-\([0-9][0-9.]*\)-.*|\1|p' "$wrapper_props" | head -n 1)"
  if [[ -z "$gradle_version" ]]; then
    echo "Could not determine Gradle version from $wrapper_props"
    exit 1
  fi

  jar_url="https://raw.githubusercontent.com/gradle/gradle/v${gradle_version}/gradle/wrapper/gradle-wrapper.jar"

  echo "gradle-wrapper.jar is missing. Downloading for Gradle ${gradle_version}..."
  mkdir -p "$wrapper_dir"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$jar_url" -o "$wrapper_jar"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$wrapper_jar" "$jar_url"
  else
    echo "Neither curl nor wget is available to download gradle-wrapper.jar"
    exit 1
  fi
}

start_mock_api_if_needed() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required to start the local mock API server for CI runs."
    exit 1
  fi

  if curl -fsS "http://127.0.0.1:${MOCK_API_PORT}/health" >/dev/null 2>&1; then
    echo "Mock API already running on port ${MOCK_API_PORT}."
    return
  fi

  echo "Starting local mock property API on port ${MOCK_API_PORT}..."
  node "$ROOT_DIR/scripts/mock-property-api.mjs" >/tmp/travelhub-mock-api.log 2>&1 &
  MOCK_API_PID=$!

  if ! wait_for_mock_api; then
    echo "Mock API failed to start. Check /tmp/travelhub-mock-api.log"
    exit 1
  fi
}

ensure_compatible_device() {
  local sdk_int

  if [[ -z "$TARGET_SERIAL" ]]; then
    TARGET_SERIAL="$(first_online_device_serial)"
  fi

  if [[ -z "$TARGET_SERIAL" ]]; then
    echo "No online Android device detected after startup checks."
    exit 1
  fi

  sdk_int="$(device_sdk_int "$TARGET_SERIAL")"
  if [[ -z "$sdk_int" || ! "$sdk_int" =~ ^[0-9]+$ ]]; then
    echo "Could not determine SDK version for device '$TARGET_SERIAL'."
    exit 1
  fi

  if (( sdk_int < MIN_SDK )); then
    echo "Device '$TARGET_SERIAL' is not compatible: SDK $sdk_int < required min SDK $MIN_SDK."
    echo "Start or configure an AVD with API level >= $MIN_SDK."
    exit 1
  fi

  echo "Using Android device '$TARGET_SERIAL' (SDK $sdk_int)."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wiremock)
      USE_WIREMOCK=true
      shift
      ;;
    --start-emulator)
      START_EMULATOR=true
      shift
      ;;
    --headless)
      HEADLESS=true
      shift
      ;;
    --ci)
      CI_MODE=true
      START_EMULATOR=true
      HEADLESS=true
      shift
      ;;
    --boot-timeout-sec)
      if [[ -z "${2:-}" || ! "${2}" =~ ^[0-9]+$ ]]; then
        echo "Missing or invalid numeric value for --boot-timeout-sec"
        exit 1
      fi
      BOOT_TIMEOUT_SEC="$2"
      shift 2
      ;;
    --avd)
      if [[ -z "${2:-}" ]]; then
        echo "Missing value for --avd"
        exit 1
      fi
      AVD_NAME="$2"
      shift 2
      ;;
    --class)
      if [[ -z "${2:-}" ]]; then
        echo "Missing value for --class"
        exit 1
      fi
      TEST_CLASS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: ./scripts/run-android-espresso-tests.sh [--wiremock] [--start-emulator] [--headless] [--ci] [--boot-timeout-sec <seconds>] [--avd <name>] [--class <fully.qualified.TestClass>]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Use --help for usage."
      exit 1
      ;;
  esac
done

if ! ADB_BIN="$(resolve_tool adb)"; then
  echo "adb not found. Install Android platform-tools and ensure adb is in PATH."
  exit 1
fi

if ! EMULATOR_BIN="$(resolve_tool emulator)"; then
  EMULATOR_BIN=""
fi

"$ADB_BIN" kill-server >/dev/null 2>&1 || true
"$ADB_BIN" start-server >/dev/null

if ! has_online_device; then
  if [[ "$START_EMULATOR" == "true" ]]; then
    start_emulator_if_needed
  else
    echo "No Android device/emulator is online."
    echo "Use --start-emulator to boot an AVD automatically, or connect a device first."
    exit 1
  fi
fi

ensure_compatible_device
optimize_device_for_e2e

if [[ "$CI_MODE" == "true" && "$USE_WIREMOCK" == "true" ]]; then
  start_mock_api_if_needed
fi

if [[ "$USE_WIREMOCK" == "true" ]]; then
  npm run android:sync:wiremock
else
  npm run android:sync
fi

cd "$ANDROID_DIR"
ensure_gradle_wrapper

if [[ -n "$TEST_CLASS" ]]; then
  ANDROID_SERIAL="$TARGET_SERIAL" ./gradlew connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=$TEST_CLASS"
else
  ANDROID_SERIAL="$TARGET_SERIAL" ./gradlew connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.uniandes.travelhub.app.TravelHubEspressoTest"
fi
