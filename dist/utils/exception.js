'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RuntimeException = exports.RuntimeException = function () {
    function RuntimeException(message) {
        _classCallCheck(this, RuntimeException);

        this._message = message;
    }

    _createClass(RuntimeException, [{
        key: 'toString',
        value: function toString() {
            return this.name + ': ' + this.message;
        }
    }, {
        key: 'name',
        get: function get() {
            return 'RuntimeException';
        }
    }, {
        key: 'message',
        get: function get() {
            return this._message;
        }
    }]);

    return RuntimeException;
}();

var IllegalStateException = exports.IllegalStateException = function (_RuntimeException) {
    _inherits(IllegalStateException, _RuntimeException);

    function IllegalStateException(message) {
        _classCallCheck(this, IllegalStateException);

        return _possibleConstructorReturn(this, (IllegalStateException.__proto__ || Object.getPrototypeOf(IllegalStateException)).call(this, message));
    }

    _createClass(IllegalStateException, [{
        key: 'name',
        get: function get() {
            return 'IllegalStateException';
        }
    }]);

    return IllegalStateException;
}(RuntimeException);

var InvalidArgumentException = exports.InvalidArgumentException = function (_RuntimeException2) {
    _inherits(InvalidArgumentException, _RuntimeException2);

    function InvalidArgumentException(message) {
        _classCallCheck(this, InvalidArgumentException);

        return _possibleConstructorReturn(this, (InvalidArgumentException.__proto__ || Object.getPrototypeOf(InvalidArgumentException)).call(this, message));
    }

    _createClass(InvalidArgumentException, [{
        key: 'name',
        get: function get() {
            return 'InvalidArgumentException';
        }
    }]);

    return InvalidArgumentException;
}(RuntimeException);

var NotImplementedException = exports.NotImplementedException = function (_RuntimeException3) {
    _inherits(NotImplementedException, _RuntimeException3);

    function NotImplementedException(message) {
        _classCallCheck(this, NotImplementedException);

        return _possibleConstructorReturn(this, (NotImplementedException.__proto__ || Object.getPrototypeOf(NotImplementedException)).call(this, message));
    }

    _createClass(NotImplementedException, [{
        key: 'name',
        get: function get() {
            return 'NotImplementedException';
        }
    }]);

    return NotImplementedException;
}(RuntimeException);