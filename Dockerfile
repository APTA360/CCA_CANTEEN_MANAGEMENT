FROM node:22-alpine

ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["node", "server.js"]
