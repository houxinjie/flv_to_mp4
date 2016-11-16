'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Log = function () {
    function Log() {
        _classCallCheck(this, Log);
    }

    _createClass(Log, null, [{
        key: 'e',
        value: function e(tag, msg) {
            if (!Log.ENABLE_ERROR) {
                return;
            }

            if (!tag || Log.FORCE_GLOBAL_TAG) tag = Log.GLOBAL_TAG;

            var str = '[' + tag + '] > ' + msg;

            if (console.error) {
                console.error(str);
            } else if (console.warn) {
                console.warn(str);
            } else {
                console.log(str);
            }
        }
    }, {
        key: 'i',
        value: function i(tag, msg) {
            if (!Log.ENABLE_INFO) {
                return;
            }

            if (!tag || Log.FORCE_GLOBAL_TAG) tag = Log.GLOBAL_TAG;

            var str = '[' + tag + '] > ' + msg;

            if (console.info) {
                console.info(str);
            } else {
                console.log(str);
            }
        }
    }, {
        key: 'w',
        value: function w(tag, msg) {
            if (!Log.ENABLE_WARN) {
                return;
            }

            if (!tag || Log.FORCE_GLOBAL_TAG) tag = Log.GLOBAL_TAG;

            var str = '[' + tag + '] > ' + msg;

            if (console.warn) {
                console.warn(str);
            } else {
                console.log(str);
            }
        }
    }, {
        key: 'd',
        value: function d(tag, msg) {
            if (!Log.ENABLE_DEBUG) {
                return;
            }

            if (!tag || Log.FORCE_GLOBAL_TAG) tag = Log.GLOBAL_TAG;

            var str = '[' + tag + '] > ' + msg;

            if (console.debug) {
                console.debug(str);
            } else {
                console.log(str);
            }
        }
    }, {
        key: 'v',
        value: function v(tag, msg) {
            if (!Log.ENABLE_VERBOSE) {
                return;
            }

            if (!tag || Log.FORCE_GLOBAL_TAG) tag = Log.GLOBAL_TAG;

            console.log('[' + tag + '] > ' + msg);
        }
    }]);

    return Log;
}();

Log.GLOBAL_TAG = 'flv.js';
Log.FORCE_GLOBAL_TAG = false;
Log.ENABLE_ERROR = true;
Log.ENABLE_INFO = true;
Log.ENABLE_WARN = true;
Log.ENABLE_DEBUG = true;
Log.ENABLE_VERBOSE = true;

exports.default = Log;