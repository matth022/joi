'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Ref = require('../../ref');
var Hoek = require('hoek');

// Declare internals

var internals = {};

internals.isoDate = /^(?:[-+]\d{2})?(?:\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?![T]$|[T][\d]+Z$)(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24\:?00)(?:[.,]\d+(?!:))?)(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[Z]|(?:[+-])(?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?)?$/;
internals.invalidDate = new Date('');
internals.isIsoDate = function () {

    var isoString = internals.isoDate.toString();

    return function (date) {

        return date && date.toString() === isoString;
    };
}();

internals.Date = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'date';
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = {
            value: options.convert && internals.Date.toDate(value, this._flags.format, this._flags.timestamp, this._flags.multiplier) || value
        };

        if (result.value instanceof Date && !isNaN(result.value.getTime())) {
            result.errors = null;
        } else if (!options.convert) {
            result.errors = this.createError('date.strict', null, state, options);
        } else {
            var type = void 0;
            if (internals.isIsoDate(this._flags.format)) {
                type = 'isoDate';
            } else if (this._flags.timestamp) {
                type = 'timestamp.' + this._flags.timestamp;
            } else {
                type = 'base';
            }

            result.errors = this.createError('date.' + type, null, state, options);
        }

        return result;
    };

    _class.toDate = function toDate(value, format, timestamp, multiplier) {

        if (value instanceof Date) {
            return value;
        }

        if (typeof value === 'string' || typeof value === 'number' && !isNaN(value) && isFinite(value)) {

            if (typeof value === 'string' && /^[+-]?\d+(\.\d+)?$/.test(value)) {

                value = parseFloat(value);
            }

            var date = void 0;
            if (format && internals.isIsoDate(format)) {
                date = format.test(value) ? new Date(value) : internals.invalidDate;
            } else if (timestamp && multiplier) {
                date = new Date(value * multiplier);
            } else {
                date = new Date(value);
            }

            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    };

    _class.prototype.iso = function iso() {

        if (this._flags.format === internals.isoDate) {
            return this;
        }

        var obj = this.clone();
        obj._flags.format = internals.isoDate;
        return obj;
    };

    _class.prototype.timestamp = function timestamp(type) {

        type = type || 'javascript';

        var allowed = ['javascript', 'unix'];
        Hoek.assert(allowed.indexOf(type) !== -1, '"type" must be one of "' + allowed.join('", "') + '"');

        if (this._flags.timestamp === type) {
            return this;
        }

        var obj = this.clone();
        obj._flags.timestamp = type;
        obj._flags.multiplier = type === 'unix' ? 1000 : 1;
        return obj;
    };

    _class.prototype._isIsoDate = function _isIsoDate(value) {

        return internals.isoDate.test(value);
    };

    return _class;
}(Any);

internals.compare = function (type, compare) {

    return function (date) {

        var isNow = date === 'now';
        var isRef = Ref.isRef(date);

        if (!isNow && !isRef) {
            date = internals.Date.toDate(date);
        }

        Hoek.assert(date, 'Invalid date format');

        return this._test(type, date, function (value, state, options) {

            var compareTo = void 0;
            if (isNow) {
                compareTo = Date.now();
            } else if (isRef) {
                compareTo = internals.Date.toDate(date(state.reference || state.parent, options));

                if (!compareTo) {
                    return this.createError('date.ref', { ref: date.key }, state, options);
                }

                compareTo = compareTo.getTime();
            } else {
                compareTo = date.getTime();
            }

            if (compare(value.getTime(), compareTo)) {
                return value;
            }

            return this.createError('date.' + type, { limit: new Date(compareTo) }, state, options);
        });
    };
};
internals.Date.prototype.min = internals.compare('min', function (value, date) {
    return value >= date;
});
internals.Date.prototype.max = internals.compare('max', function (value, date) {
    return value <= date;
});

module.exports = new internals.Date();
