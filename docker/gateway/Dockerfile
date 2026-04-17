FROM nginx:alpine
RUN apk add --no-cache nginx-module-njs
COPY nginx.conf /etc/nginx/nginx.conf
COPY jwt.js /etc/nginx/jwt.js
