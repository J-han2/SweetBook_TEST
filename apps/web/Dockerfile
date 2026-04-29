FROM node:20-alpine

WORKDIR /app

ENV INTERNAL_API_BASE_URL=http://api:8000

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
