# Build do Kurio: Vite no modo "demo" (otimizado, com os mocks MSW ligados) servido por nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# A API é simulada: o MSW (service worker) roda NO NAVEGADOR e o build demo precisa dele ligado.
# As variáveis ficam explícitas aqui (têm precedência sobre o .env.demo), então o deploy nunca
# publica um build sem mocks por causa de um arquivo .env ausente. Não há backend: o nginx não faz proxy de /api.
ENV VITE_ENABLE_MOCKS=true
ENV VITE_MOCK_SCENARIO=default
ENV VITE_API_URL=/api
# Falha o build se o chunk dos mocks ou o service worker não estiverem no resultado.
RUN npm run build:demo && ls dist/assets/enable-*.js dist/mockServiceWorker.js > /dev/null

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
