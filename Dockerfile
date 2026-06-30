# Frontend: build tĩnh bằng Vite → phục vụ qua nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* được "nướng" vào bundle lúc build. /api = cùng origin (nginx reverse-proxy → container proxy).
ARG VITE_PROXY_URL=/api
ARG VITE_PROXY_SECRET=
ENV VITE_PROXY_URL=$VITE_PROXY_URL \
    VITE_PROXY_SECRET=$VITE_PROXY_SECRET
RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
