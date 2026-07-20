# syntax=docker/dockerfile:1

FROM node:22-alpine AS development

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:22-alpine AS build

WORKDIR /app

ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

# FROM node:22-alpine AS production

# WORKDIR /app

# RUN npm install -g serve@14

# COPY --from=build /app/dist ./dist

# ENV PORT=3000
# ENV NODE_ENV=production

# EXPOSE 3000

# HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
#   CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# CMD ["serve", "-s", "dist", "-l", "3000"]