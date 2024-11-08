FROM node:18.5.0-alpine3.16

RUN apk update
RUN apk add git
RUN apk add python3
RUN apk add make
RUN apk add g++
RUN apk add curl

COPY . /opt
WORKDIR /opt
RUN yarn && yarn compile
