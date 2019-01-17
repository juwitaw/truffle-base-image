FROM node:9-alpine
LABEL maintainer="Juwita Winadwiastuti <juwita.winadwiastuti@dattabot.io>"
RUN rm -rf /var/cache/apk/* && \
    mkdir /code
WORKDIR /code
ADD package.json package.json
RUN apk update && \
    apk upgrade && \
    apk --update add python py-pip git make g++ && \
    apk add --no-cache bash && \
    npm install -g --unsafe-perm truffle@beta && \
    npm install -g mocha@5.2.0 && \
    npm install -g mocha-junit-reporter@1.18.0 && \
    npm install && \
    sed -i 's/lcov/cobertura/g' ./node_modules/solidity-coverage/lib/app.js
CMD ["truffle"]