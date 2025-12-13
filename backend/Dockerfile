FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client (using .env file for reliability during build)
RUN echo "DATABASE_URL=postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public" > .env
RUN npx prisma generate

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
