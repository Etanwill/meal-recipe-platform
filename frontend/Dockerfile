# ---- Stage 1: Build the React app ----
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (caching optimization)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent

# Copy all frontend source code
COPY . .

# Build the production React app
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy built React files to Nginx's serve directory
COPY --from=builder /app/build /usr/share/nginx/html

# Copy our custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
