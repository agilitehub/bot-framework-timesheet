FROM node:8.9.4-alpine
WORKDIR /app
ADD . /app
EXPOSE 6022
CMD npm start