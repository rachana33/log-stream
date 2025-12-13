FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client with dummy DB URL
RUN DATABASE_URL="postgresql://dummy:5432/mydb" npx prisma generate --schema=./prisma/schema.prisma

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
