FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Web gọi API cùng tên miền: https://<tên miền>/api
ENV VITE_API_URL=/api
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
