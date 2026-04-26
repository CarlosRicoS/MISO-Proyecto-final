#!/bin/sh
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL:-https://n548xflwbl.execute-api.us-east-1.amazonaws.com}",
  "propertyApiPath": "${PROPERTY_API_PATH:-/poc-properties/api/property}",
  "propertyApiToken": "${PROPERTY_API_TOKEN:-}",
  "bookingApiPath": "${BOOKING_API_PATH:-/booking-orchestrator/api/reservations}",
  "bookingListApiPath": "${BOOKING_LIST_API_PATH:-/booking/api/booking/}"
}
EOF
exec nginx -g 'daemon off;'
