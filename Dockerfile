FROM node:9-alpine
MAINTAINER Juwita Winadwiastuti <juwita.winadwiastuti@dattabot.io>
RUN rm -rf /var/cache/apk/* && \
    apk update && \
    apk upgrade && \
    apk add --no-cache bash && \
    npm install -g truffle@4.1.11 && \
    npm install mocha@5.2.0 && \
    npm install mocha-junit-reporter@1.17.0
CMD ["truffle"]