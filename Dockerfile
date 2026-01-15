# Step 1: Build React app
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Step 2: Serve with Nginx on Cloud Run
FROM nginx:alpine

# Remove default config and copy our custom one
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from the 'dist' folder
COPY --from=build /app/dist /usr/share/nginx/html

# Important: Ensure Nginx can listen on 8080 
# Cloud Run automatically maps this port
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]