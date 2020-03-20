'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _ethereumjsUtil = require('ethereumjs-util');

var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);

var _abiDecodeFunctions = require('abi-decode-functions');

var _abiDecodeFunctions2 = _interopRequireDefault(_abiDecodeFunctions);

var _trace = require('./trace');

var _sourceMaps = require('./source-maps');

var _assembler_info_provider = require('./assembler_info_provider');

var _assembler_info_provider2 = _interopRequireDefault(_assembler_info_provider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var REVERT_MESSAGE_ID = '0x08c379a0'; // first 4byte of keccak256('Error(string)').

var Web3TraceProvider = function () {
  function Web3TraceProvider(web3) {
    (0, _classCallCheck3.default)(this, Web3TraceProvider);

    this.web3 = web3;
    this.nextProvider = web3.currentProvider;
    this.assemblerInfoProvider = new _assembler_info_provider2.default();
  }

  /**
   * Should be called to make sync request
   *
   * @method send
   * @param {Object} payload
   * @return {Object} result
   */


  (0, _createClass3.default)(Web3TraceProvider, [{
    key: 'send',
    value: function send() {
      var payload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return this.nextProvider.send(payload);
    }
  }, {
    key: 'sendAsync',
    value: function sendAsync(payload, cb) {
      var _this = this;

      if (payload.method === 'eth_sendTransaction' || payload.method === 'eth_call' || payload.method === 'eth_getTransactionReceipt') {
        var txData = payload.params[0];
        return this.nextProvider.send(payload, function (err, result) {
          if (_this._isGanacheErrorResponse(result)) {
            var txHash = result.result || (0, _keys2.default)(result.error.data)[0];
            if (_ethereumjsUtil2.default.toBuffer(txHash).length === 32) {
              var toAddress = txData.to;
              // record tx trace
              _this.recordTxTrace(toAddress, txHash, result, _this.getFunctionId(payload), _this._isInvalidOpcode(result)).then(function (traceResult) {
                result.error.message += traceResult;
                cb(err, result);
              }).catch(function (traceError) {
                cb(traceError, result);
              });
            } else {
              console.warn('Could not trace REVERT / invalid opcode. maybe legacy node.');
              cb(err, result);
            }
          } else if (_this._isGethEthCallRevertResponse(payload.method, result)) {
            var messageBuf = _this.pickUpRevertReason(_ethereumjsUtil2.default.toBuffer(result.result));
            console.warn('VM Exception while processing transaction: revert. reason: ' + messageBuf.toString());
            cb(err, result);
          } else if (_this._isGethErrorReceiptResponse(payload.method, result)) {
            // record tx trace
            var _toAddress = result.result.to;
            var _txHash = result.result.transactionHash;
            _this.recordTxTrace(_toAddress, _txHash, result, _this.getFunctionId(payload)).then(function (traceResult) {
              console.warn(traceResult);
              cb(err, result);
            }).catch(function (traceError) {
              cb(traceError, result);
            });
          } else {
            cb(err, result);
          }
        });
      }

      return this.nextProvider.send(payload, cb);
    }

    /**
     * Check the response result is ganache-core response and has revert error.
     * @param  result Response data.
     * @return boolean
     */

  }, {
    key: '_isGanacheErrorResponse',
    value: function _isGanacheErrorResponse(result) {
      return result.error && result.error.message && (result.error.message.endsWith(': revert') || result.error.message.endsWith(': invalid opcode'));
    }

    /**
     * Check is invalid opcode error.
     * @param  result Response data.
     * @return boolean
     */

  }, {
    key: '_isInvalidOpcode',
    value: function _isInvalidOpcode(result) {
      return result.error.message.endsWith(': invalid opcode');
    }

    /**
     * Check the response result is go-ethereum response and has revert reason.
     * @param  method Request JSON-RPC method
     * @param  result Response data.
     * @return boolean
     */

  }, {
    key: '_isGethEthCallRevertResponse',
    value: function _isGethEthCallRevertResponse(method, result) {
      return method === 'eth_call' && result.result && result.result.startsWith(REVERT_MESSAGE_ID);
    }

    /**
     * Check the response result is go-ethereum transaction receipt response and it mark error.
     * @param  method Request JSON-RPC method
     * @param  result Response data.
     * @return boolean
     */

  }, {
    key: '_isGethErrorReceiptResponse',
    value: function _isGethErrorReceiptResponse(method, result) {
      return method === 'eth_getTransactionReceipt' && result.result && result.result.status === '0x0';
    }

    /**
     * Pick up revert reason
     * @param  returndata Return data of evm that in contains eth_call response.
     * @return revert reason message
     */

  }, {
    key: 'pickUpRevertReason',
    value: function pickUpRevertReason(returndata) {
      if (returndata instanceof String) {
        returndata = _ethereumjsUtil2.default.toBuffer(returndata, 'hex');
      } else if (!(returndata instanceof Buffer)) {
        throw new Error('returndata is MUST hex String or Buffer.');
      }
      if (returndata.length < 4 + 32 + 32 + 32) {
        //  4: method id
        // 32: abi encode header
        // 32: string length
        // 32: string body(min)
        throw new Error('returndata.length is MUST 100+.');
      }
      var dataoffset = _ethereumjsUtil2.default.bufferToInt(returndata.slice(4).slice(0, 32));
      var abiencodedata = returndata.slice(36);
      var stringBody = abiencodedata.slice(dataoffset);
      var length = _ethereumjsUtil2.default.bufferToInt(abiencodedata.slice(0, 32));
      return stringBody.slice(0, length);
    }

    /**
     * Gets the contract code by address
     * @param  address Address of the contract
     * @return Code of the contract
     */

  }, {
    key: 'getContractCode',
    value: function getContractCode(address) {
      var _this2 = this;

      return new _promise2.default(function (resolve, reject) {
        _this2.nextProvider.sendAsync({
          id: new Date().getTime(),
          method: 'eth_getCode',
          params: [address]
        }, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.result);
          }
        });
      });
    }

    /**
     * Gets the debug trace of a transaction
     * @param  nextId Next request ID of JSON-RPC.
     * @param  txHash Hash of the transactuon to get a trace for
     * @param  traceParams Config object allowing you to specify if you need memory/storage/stack traces.
     * @return Transaction trace
     */

  }, {
    key: 'getTransactionTrace',
    value: function getTransactionTrace(nextId, txHash) {
      var _this3 = this;

      var traceParams = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return new _promise2.default(function (resolve, reject) {
        _this3.nextProvider.sendAsync({
          id: nextId,
          method: 'debug_traceTransaction',
          params: [txHash, traceParams]
        }, function (err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result.result);
          }
        });
      });
    }
  }, {
    key: 'recordTxTrace',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(address, txHash, result, functionId) {
        var isInvalid = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
        var trace, logs, evmCallStack, opcodes, decoder, startPointStack;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                address = !address || address === '0x0' ? _trace.constants.NEW_CONTRACT : address;
                _context.next = 3;
                return this.getTransactionTrace(result.id + 1, txHash, {
                  disableMemory: true,
                  disableStack: false,
                  disableStorage: true
                });

              case 3:
                trace = _context.sent;
                logs = trace === undefined ? [] : trace.structLogs;
                evmCallStack = (0, _trace.getRevertTrace)(logs, address);
                _context.next = 8;
                return this.getContractCode(address);

              case 8:
                opcodes = _context.sent;
                decoder = new _abiDecodeFunctions2.default(opcodes);
                // create function call point stack

                startPointStack = {
                  address: address,
                  structLog: {
                    pc: decoder.findProgramCounter(functionId),
                    type: 'call start point'
                  }
                };

                evmCallStack.unshift(startPointStack);

                if (!(evmCallStack.length > 1)) {
                  _context.next = 16;
                  break;
                }

                return _context.abrupt('return', this.getStackTrace(evmCallStack));

              case 16:
                return _context.abrupt('return', this.getStackTranceSimple(address, txHash, result, isInvalid));

              case 17:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function recordTxTrace(_x4, _x5, _x6, _x7) {
        return _ref.apply(this, arguments);
      }

      return recordTxTrace;
    }()
  }, {
    key: 'getStackTranceSimple',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(address, txHash, result) {
        var isInvalid = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        var bytecode, contractData, bytecodeHex, sourceMap, pcToSourceRange, sourceRange, pc, dataObj, errorType, traceArray;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.getContractCode(address);

              case 2:
                bytecode = _context2.sent;
                contractData = this.assemblerInfoProvider.getContractDataIfExists(bytecode);

                if (contractData) {
                  _context2.next = 8;
                  break;
                }

                console.warn('unknown contract address: ' + address + '.');
                console.warn('Maybe you try to \'rm build/contracts/* && truffle compile\' for reset sourceMap.');
                return _context2.abrupt('return', null);

              case 8:
                bytecodeHex = _ethereumjsUtil2.default.stripHexPrefix(bytecode);
                sourceMap = contractData.sourceMapRuntime;
                pcToSourceRange = (0, _sourceMaps.parseSourceMap)(this.assemblerInfoProvider.sourceCodes, sourceMap, bytecodeHex, this.assemblerInfoProvider.sources);
                sourceRange = void 0;
                pc = -1;

                if (result.error && result.error.data) {
                  pc = result.error.data[txHash].program_counter;
                } else {
                  dataObj = { 'message': 'not supported data formart.' };

                  result.error = result.error ? result.error : {};
                  result.error.data = dataObj;
                }
                // Sometimes there is not a mapping for this pc (e.g. if the revert
                // actually happens in assembly).

              case 14:
                if (sourceRange) {
                  _context2.next = 22;
                  break;
                }

                sourceRange = pcToSourceRange[pc];
                pc -= 1;

                if (!(pc < 0)) {
                  _context2.next = 20;
                  break;
                }

                console.warn('could not find matching sourceRange for structLog: ' + (0, _stringify2.default)(result.error.data));
                return _context2.abrupt('return', null);

              case 20:
                _context2.next = 14;
                break;

              case 22:
                errorType = isInvalid ? 'invalid opcode' : 'REVERT';

                if (!sourceRange) {
                  _context2.next = 26;
                  break;
                }

                traceArray = [sourceRange.fileName, sourceRange.location.start.line, sourceRange.location.start.column].join(':');
                return _context2.abrupt('return', '\n\nStack trace for ' + errorType + ':\n' + traceArray + '\n');

              case 26:
                return _context2.abrupt('return', '\n\nCould not determine stack trace for ' + errorType + '\n');

              case 27:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getStackTranceSimple(_x9, _x10, _x11) {
        return _ref2.apply(this, arguments);
      }

      return getStackTranceSimple;
    }()
  }, {
    key: 'getStackTrace',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(evmCallStack, functionId) {
        var sourceRanges, index, evmCallStackEntry, isContractCreation, bytecode, contractData, errMsg, bytecodeHex, sourceMap, pcToSourceRange, sourceRange, pc, traceArray;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                sourceRanges = [];
                index = 0;

              case 2:
                if (!(index < evmCallStack.length)) {
                  _context3.next = 33;
                  break;
                }

                evmCallStackEntry = evmCallStack[index];
                isContractCreation = evmCallStackEntry.address === _trace.constants.NEW_CONTRACT;

                if (!isContractCreation) {
                  _context3.next = 8;
                  break;
                }

                console.error('Contract creation not supported');
                return _context3.abrupt('continue', 30);

              case 8:
                _context3.next = 10;
                return this.getContractCode(evmCallStackEntry.address);

              case 10:
                bytecode = _context3.sent;
                contractData = this.assemblerInfoProvider.getContractDataIfExists(bytecode);

                if (contractData) {
                  _context3.next = 16;
                  break;
                }

                errMsg = isContractCreation ? 'Unknown contract creation transaction' : 'Transaction to an unknown address: ' + evmCallStackEntry.address;

                console.warn(errMsg);
                return _context3.abrupt('continue', 30);

              case 16:
                bytecodeHex = _ethereumjsUtil2.default.stripHexPrefix(bytecode);
                sourceMap = isContractCreation ? contractData.sourceMap : contractData.sourceMapRuntime;
                pcToSourceRange = (0, _sourceMaps.parseSourceMap)(this.assemblerInfoProvider.sourceCodes, sourceMap, bytecodeHex, this.assemblerInfoProvider.sources);
                sourceRange = void 0;
                pc = evmCallStackEntry.structLog.pc;
                // Sometimes there is not a mapping for this pc (e.g. if the revert
                // actually happens in assembly). In that case, we want to keep
                // searching backwards by decrementing the pc until we find a
                // mapped source range.

              case 21:
                if (sourceRange) {
                  _context3.next = 29;
                  break;
                }

                sourceRange = pcToSourceRange[pc];
                pc -= 1;

                if (!(pc <= 0)) {
                  _context3.next = 27;
                  break;
                }

                console.warn('could not find matching sourceRange for structLog: ' + evmCallStackEntry.structLog);
                return _context3.abrupt('break', 29);

              case 27:
                _context3.next = 21;
                break;

              case 29:
                if (sourceRange) {
                  sourceRanges.push(sourceRange);
                }

              case 30:
                index++;
                _context3.next = 2;
                break;

              case 33:
                if (!(sourceRanges.length > 0)) {
                  _context3.next = 36;
                  break;
                }

                traceArray = sourceRanges.map(function (sourceRange) {
                  return [sourceRange.fileName, sourceRange.location.start.line, sourceRange.location.start.column].join(':');
                });
                return _context3.abrupt('return', '\n\nStack trace for REVERT:\n' + traceArray.reverse().join('\n') + '\n');

              case 36:
                return _context3.abrupt('return', '\n\nCould not determine stack trace for REVERT\n');

              case 37:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getStackTrace(_x12, _x13) {
        return _ref3.apply(this, arguments);
      }

      return getStackTrace;
    }()

    /**
     * extract function id from transaction data part.
     * @param payload
     * @return {*}
     */

  }, {
    key: 'getFunctionId',
    value: function getFunctionId(payload) {
      var funcId = payload.params[0].data;
      if (funcId && funcId.length > 10) {
        funcId = funcId.slice(0, 10);
      }
      return funcId;
    }
  }]);
  return Web3TraceProvider;
}();

exports.default = Web3TraceProvider;
module.exports = exports['default'];