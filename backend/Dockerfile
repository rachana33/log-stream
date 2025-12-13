FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Set dummy DB URL for build step (prisma generate doesn't need real connection)
ENV DATABASE_URL="postgresql://dummy:5432/mydb"

RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
