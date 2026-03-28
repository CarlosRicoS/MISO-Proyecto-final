#!/bin/sh
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL:-https://75l952sqbk.execute-api.us-east-1.amazonaws.com}",
  "propertyApiPath": "${PROPERTY_API_PATH:-/poc-properties/api/property}",
  "propertyApiToken": "${PROPERTY_API_TOKEN:-}"
}
EOF
exec nginx -g 'daemon off;'
