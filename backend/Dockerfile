FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client (using ARG/ENV to ensure visibility)
ARG DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
