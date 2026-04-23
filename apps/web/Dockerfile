FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build
RUN mkdir -p .next/standalone/.next
RUN cp -R .next/static .next/standalone/.next/static
RUN cp -R public .next/standalone/public

EXPOSE 3000

CMD ["npm", "run", "start"]
