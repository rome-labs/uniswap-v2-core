FROM node:16.20.2-alpine3.17

RUN apk update
RUN apk add git
RUN apk add python3
RUN apk add make
RUN apk add g++

COPY . /opt
WORKDIR /opt
RUN yarn && yarn compile
