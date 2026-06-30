# Proxy Claude — Node thuần (fetch built-in), không dependency.
FROM node:22-alpine
WORKDIR /app
COPY server/proxy.mjs ./server/proxy.mjs
EXPOSE 8787
CMD ["node", "server/proxy.mjs"]
