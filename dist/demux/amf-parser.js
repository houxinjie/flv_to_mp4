'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _logger = require('../utils/logger.js');

var _logger2 = _interopRequireDefault(_logger);

var _utf8Conv = require('../utils/utf8-conv.js');

var _utf8Conv2 = _interopRequireDefault(_utf8Conv);

var _exception = require('../utils/exception.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var le = function () {
    var buf = new ArrayBuffer(2);
    new DataView(buf).setInt16(0, 256, true); // little-endian write
    return new Int16Array(buf)[0] === 256; // platform-spec read, if equal then LE
}();

var AMF = function () {
    function AMF() {
        _classCallCheck(this, AMF);
    }

    _createClass(AMF, null, [{
        key: 'parseScriptData',
        value: function parseScriptData(arrayBuffer, dataOffset, dataSize) {
            var data = {};

            try {
                var name = AMF.parseValue(arrayBuffer, dataOffset, dataSize);
                var value = AMF.parseValue(arrayBuffer, dataOffset + name.size, dataSize - name.size);

                data[name.data] = value.data;
            } catch (e) {
                _logger2.default.e('AMF', e.toString());
            }

            return data;
        }
    }, {
        key: 'parseObject',
        value: function parseObject(arrayBuffer, dataOffset, dataSize) {
            if (dataSize < 3) {
                throw new _exception.IllegalStateException('Data not enough when parse ScriptDataObject');
            }
            var name = AMF.parseString(arrayBuffer, dataOffset, dataSize);
            var value = AMF.parseValue(arrayBuffer, dataOffset + name.size, dataSize - name.size);
            var isObjectEnd = value.objectEnd;

            return {
                data: {
                    name: name.data,
                    value: value.data
                },
                size: name.size + value.size,
                objectEnd: isObjectEnd
            };
        }
    }, {
        key: 'parseVariable',
        value: function parseVariable(arrayBuffer, dataOffset, dataSize) {
            return AMF.parseObject(arrayBuffer, dataOffset, dataSize);
        }
    }, {
        key: 'parseString',
        value: function parseString(arrayBuffer, dataOffset, dataSize) {
            if (dataSize < 2) {
                throw new _exception.IllegalStateException('Data not enough when parse String');
            }
            var v = new DataView(arrayBuffer, dataOffset, dataSize);
            var length = v.getUint16(0, !le);

            var str = void 0;
            if (length > 0) {
                str = (0, _utf8Conv2.default)(new Uint8Array(arrayBuffer, dataOffset + 2, length));
            } else {
                str = '';
            }

            return {
                data: str,
                size: 2 + length
            };
        }
    }, {
        key: 'parseLongString',
        value: function parseLongString(arrayBuffer, dataOffset, dataSize) {
            if (dataSize < 4) {
                throw new _exception.IllegalStateException('Data not enough when parse LongString');
            }
            var v = new DataView(arrayBuffer, dataOffset, dataSize);
            var length = v.getUint32(0, !le);

            var str = void 0;
            if (length > 0) {
                str = (0, _utf8Conv2.default)(new Uint8Array(arrayBuffer, dataOffset + 4, length));
            } else {
                str = '';
            }

            return {
                data: str,
                size: 4 + length
            };
        }
    }, {
        key: 'parseDate',
        value: function parseDate(arrayBuffer, dataOffset, dataSize) {
            if (dataSize < 10) {
                throw new _exception.IllegalStateException('Data size invalid when parse Date');
            }
            var v = new DataView(arrayBuffer, dataOffset, dataSize);
            var timestamp = v.getFloat64(0, !le);
            var localTimeOffset = v.getInt16(8, !le);
            timestamp += localTimeOffset * 60 * 1000; // get UTC time

            return {
                data: new Date(timestamp),
                size: 8 + 2
            };
        }
    }, {
        key: 'parseValue',
        value: function parseValue(arrayBuffer, dataOffset, dataSize) {
            if (dataSize < 1) {
                throw new _exception.IllegalStateException('Data not enough when parse Value');
            }

            var v = new DataView(arrayBuffer, dataOffset, dataSize);

            var offset = 1;
            var type = v.getUint8(0);
            var value = void 0;
            var objectEnd = false;

            try {
                switch (type) {
                    case 0:
                        // Number(Double) type
                        value = v.getFloat64(1, !le);
                        offset += 8;
                        break;
                    case 1:
                        {
                            // Boolean type
                            var b = v.getUint8(1);
                            value = b ? true : false;
                            offset += 1;
                            break;
                        }
                    case 2:
                        {
                            // String type
                            var amfstr = AMF.parseString(arrayBuffer, dataOffset + 1, dataSize - 1);
                            value = amfstr.data;
                            offset += amfstr.size;
                            break;
                        }
                    case 3:
                        {
                            // Object(s) type
                            value = {};
                            var terminal = 0; // workaround for malformed Objects which has missing ScriptDataObjectEnd
                            if ((v.getUint32(dataSize - 4, !le) & 0x00FFFFFF) === 9) {
                                terminal = 3;
                            }
                            while (offset < dataSize - 4) {
                                // 4 === type(UI8) + ScriptDataObjectEnd(UI24)
                                var amfobj = AMF.parseObject(arrayBuffer, dataOffset + offset, dataSize - offset - terminal);
                                if (amfobj.objectEnd) break;
                                value[amfobj.data.name] = amfobj.data.value;
                                offset += amfobj.size;
                            }
                            if (offset <= dataSize - 3) {
                                var marker = v.getUint32(offset - 1, !le) & 0x00FFFFFF;
                                if (marker === 9) {
                                    offset += 3;
                                }
                            }
                            break;
                        }
                    case 8:
                        {
                            // ECMA array type (Mixed array)
                            value = {};
                            offset += 4; // ECMAArrayLength(UI32)
                            var _terminal = 0; // workaround for malformed MixedArrays which has missing ScriptDataObjectEnd
                            if ((v.getUint32(dataSize - 4, !le) & 0x00FFFFFF) === 9) {
                                _terminal = 3;
                            }
                            while (offset < dataSize - 8) {
                                // 8 === type(UI8) + ECMAArrayLength(UI32) + ScriptDataVariableEnd(UI24)
                                var amfvar = AMF.parseVariable(arrayBuffer, dataOffset + offset, dataSize - offset - _terminal);
                                if (amfvar.objectEnd) break;
                                value[amfvar.data.name] = amfvar.data.value;
                                offset += amfvar.size;
                            }
                            if (offset <= dataSize - 3) {
                                var _marker = v.getUint32(offset - 1, !le) & 0x00FFFFFF;
                                if (_marker === 9) {
                                    offset += 3;
                                }
                            }
                            break;
                        }
                    case 9:
                        // ScriptDataObjectEnd
                        value = undefined;
                        offset = 1;
                        objectEnd = true;
                        break;
                    case 10:
                        {
                            // Strict array type
                            // ScriptDataValue[n]. NOTE: according to video_file_format_spec_v10_1.pdf
                            value = [];
                            var strictArrayLength = v.getUint32(1, !le);
                            offset += 4;
                            for (var i = 0; i < strictArrayLength; i++) {
                                var val = AMF.parseValue(arrayBuffer, dataOffset + offset, dataSize - offset);
                                value.push(val.data);
                                offset += val.size;
                            }
                            break;
                        }
                    case 11:
                        {
                            // Date type
                            var date = AMF.parseDate(arrayBuffer, dataOffset + 1, dataSize - 1);
                            value = date.data;
                            offset += date.size;
                            break;
                        }
                    case 12:
                        {
                            // Long string type
                            var amfLongStr = AMF.parseString(arrayBuffer, dataOffset + 1, dataSize - 1);
                            value = amfLongStr.data;
                            offset += amfLongStr.size;
                            break;
                        }
                    default:
                        // ignore and skip
                        offset = dataSize;
                        _logger2.default.w('AMF', 'Unsupported AMF value type ' + type);
                }
            } catch (e) {
                _logger2.default.e('AMF', e.toString());
            }

            return {
                data: value,
                size: offset,
                objectEnd: objectEnd
            };
        }
    }]);

    return AMF;
}();

exports.default = AMF;