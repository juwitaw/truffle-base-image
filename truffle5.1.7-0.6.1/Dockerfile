FROM node:12-alpine
LABEL maintainer="Juwita Winadwiastuti <juwita.winadwiastuti@dattabot.io>"
RUN rm -rf /var/cache/apk/* && \
    mkdir /code
WORKDIR /code
COPY ["package.json", "parser.js", ".babelrc", "web3-trace-provider.js", "./"]
RUN apk update && \
    apk upgrade && \
    apk --update add python py-pip git make g++ && \
    apk add --no-cache bash && \
    npm install --unsafe-perm -g truffle@5.1.7 && \
    npm install -g mocha@7.0.0 && \
    npm install -g solc@0.6.1 && \
    npm install -g mocha-junit-reporter@1.23.1
RUN npm install && \
    sed -i 's/lcov/cobertura/g' ./node_modules/solidity-coverage/lib/api.js
    # cp  .js node_modules/solidity-parser-sc/build/ && \
    # cp web3-trace-provider.js node_modules/sol-trace/build/
CMD ["truffle"]