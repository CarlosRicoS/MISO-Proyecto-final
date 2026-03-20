#!/bin/sh
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL:-http://localhost}"
}
EOF
exec nginx -g 'daemon off;'
