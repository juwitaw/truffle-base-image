FROM node:alpine
MAINTAINER Juwita Winadwiastuti <juwita.winadwiastuti@dattabot.io>
RUN apk update && apk upgrade && apk add bash && npm install -g truffle
CMD ["truffle"]
