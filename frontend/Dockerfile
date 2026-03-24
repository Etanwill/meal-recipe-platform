# ---- Stage 1: Build the React app ----
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./

RUN npm install --legacy-peer-deps

COPY . .

ENV CI=false
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Debug: show what was built
RUN echo "=== Build output ===" && find /app/build -type f | head -20

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy built React files
COPY --from=builder /app/build /usr/share/nginx/html

# Verify files are there
RUN echo "=== Nginx html contents ===" && ls -la /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
