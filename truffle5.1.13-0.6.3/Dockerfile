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
    npm install -g truffle@5.1.13 && \
    # npm install --unsafe-perm -g truffle@5.1.17 && \
    npm install -g mocha@7.1.0 && \
    npm install -g solc@0.6.3 && \
    npm install -g mocha-junit-reporter@1.23.3
RUN npm install solidity-coverage@0.7.2
RUN sed -i 's/lcov/cobertura/g' ./node_modules/solidity-coverage/lib/api.js && cat ./node_modules/solidity-coverage/lib/api.js
    # cp  .js node_modules/solidity-parser-sc/build/ && \
    # cp web3-trace-provider.js node_modules/sol-trace/build/
CMD ["truffle"]