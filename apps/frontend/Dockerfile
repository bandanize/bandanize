# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

LABEL org.opencontainers.image.source = "https://github.com/bandanize/bandanize"

# Fix security vulnerabilities
RUN apk add --no-cache \
    'libpng>=1.6.55-r0' \
    'zlib>=1.3.2-r0'

COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy custom entrypoint
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
