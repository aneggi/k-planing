FROM node:20-alpine
ARG VITE_ENV_FILE=.env.production
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
COPY ${VITE_ENV_FILE} .env
RUN npm install
COPY frontend . 
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
