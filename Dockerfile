# Build do Kurio: Vite no modo "demo" (otimizado, com os mocks MSW ligados) servido por nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Modo demo: lê .env.demo (VITE_ENABLE_MOCKS=true, VITE_API_URL=/api). Não há backend:
# o "servidor" é o MSW rodando no navegador, por isso o nginx não faz proxy de /api.
RUN npm run build:demo

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
