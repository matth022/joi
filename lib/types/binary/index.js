'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Hoek = require('hoek');

// Declare internals

var internals = {};

internals.Binary = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'binary';
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = {
            value: value
        };

        if (typeof value === 'string' && options.convert) {

            try {
                result.value = new Buffer(value, this._flags.encoding);
            } catch (e) {}
        }

        result.errors = Buffer.isBuffer(result.value) ? null : this.createError('binary.base', null, state, options);
        return result;
    };

    _class.prototype.encoding = function encoding(_encoding) {

        Hoek.assert(Buffer.isEncoding(_encoding), 'Invalid encoding:', _encoding);

        if (this._flags.encoding === _encoding) {
            return this;
        }

        var obj = this.clone();
        obj._flags.encoding = _encoding;
        return obj;
    };

    _class.prototype.min = function min(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('min', limit, function (value, state, options) {

            if (value.length >= limit) {
                return value;
            }

            return this.createError('binary.min', { limit: limit, value: value }, state, options);
        });
    };

    _class.prototype.max = function max(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('max', limit, function (value, state, options) {

            if (value.length <= limit) {
                return value;
            }

            return this.createError('binary.max', { limit: limit, value: value }, state, options);
        });
    };

    _class.prototype.length = function length(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('length', limit, function (value, state, options) {

            if (value.length === limit) {
                return value;
            }

            return this.createError('binary.length', { limit: limit, value: value }, state, options);
        });
    };

    return _class;
}(Any);

module.exports = new internals.Binary();
