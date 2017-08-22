'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Ref = require('../../ref');
var Hoek = require('hoek');

// Declare internals

var internals = {
    precisionRx: /(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/
};

internals.Number = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'number';
        _this._invalids.add(Infinity);
        _this._invalids.add(-Infinity);
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = {
            errors: null,
            value: value
        };

        if (typeof value === 'string' && options.convert) {

            var number = parseFloat(value);
            result.value = isNaN(number) || !isFinite(value) ? NaN : number;
        }

        var isNumber = typeof result.value === 'number' && !isNaN(result.value);

        if (options.convert && 'precision' in this._flags && isNumber) {

            // This is conceptually equivalent to using toFixed but it should be much faster
            var precision = Math.pow(10, this._flags.precision);
            result.value = Math.round(result.value * precision) / precision;
        }

        result.errors = isNumber ? null : this.createError('number.base', null, state, options);
        return result;
    };

    _class.prototype.multiple = function multiple(base) {

        var isRef = Ref.isRef(base);

        if (!isRef) {
            Hoek.assert(typeof base === 'number' && isFinite(base), 'multiple must be a number');
            Hoek.assert(base > 0, 'multiple must be greater than 0');
        }

        return this._test('multiple', base, function (value, state, options) {

            var divisor = isRef ? base(state.reference || state.parent, options) : base;

            if (isRef && (typeof divisor !== 'number' || !isFinite(divisor))) {
                return this.createError('number.ref', { ref: base.key }, state, options);
            }

            if (value % divisor === 0) {
                return value;
            }

            return this.createError('number.multiple', { multiple: base, value: value }, state, options);
        });
    };

    _class.prototype.integer = function integer() {

        return this._test('integer', undefined, function (value, state, options) {

            return Number.isSafeInteger(value) ? value : this.createError('number.integer', { value: value }, state, options);
        });
    };

    _class.prototype.negative = function negative() {

        return this._test('negative', undefined, function (value, state, options) {

            if (value < 0) {
                return value;
            }

            return this.createError('number.negative', { value: value }, state, options);
        });
    };

    _class.prototype.positive = function positive() {

        return this._test('positive', undefined, function (value, state, options) {

            if (value > 0) {
                return value;
            }

            return this.createError('number.positive', { value: value }, state, options);
        });
    };

    _class.prototype.precision = function precision(limit) {

        Hoek.assert(Number.isSafeInteger(limit), 'limit must be an integer');
        Hoek.assert(!('precision' in this._flags), 'precision already set');

        var obj = this._test('precision', limit, function (value, state, options) {

            var places = value.toString().match(internals.precisionRx);
            var decimals = Math.max((places[1] ? places[1].length : 0) - (places[2] ? parseInt(places[2], 10) : 0), 0);
            if (decimals <= limit) {
                return value;
            }

            return this.createError('number.precision', { limit: limit, value: value }, state, options);
        });

        obj._flags.precision = limit;
        return obj;
    };

    return _class;
}(Any);

internals.compare = function (type, compare) {

    return function (limit) {

        var isRef = Ref.isRef(limit);
        var isNumber = typeof limit === 'number' && !isNaN(limit);

        Hoek.assert(isNumber || isRef, 'limit must be a number or reference');

        return this._test(type, limit, function (value, state, options) {

            var compareTo = void 0;
            if (isRef) {
                compareTo = limit(state.reference || state.parent, options);

                if (!(typeof compareTo === 'number' && !isNaN(compareTo))) {
                    return this.createError('number.ref', { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (compare(value, compareTo)) {
                return value;
            }

            return this.createError('number.' + type, { limit: compareTo, value: value }, state, options);
        });
    };
};

internals.Number.prototype.min = internals.compare('min', function (value, limit) {
    return value >= limit;
});
internals.Number.prototype.max = internals.compare('max', function (value, limit) {
    return value <= limit;
});
internals.Number.prototype.greater = internals.compare('greater', function (value, limit) {
    return value > limit;
});
internals.Number.prototype.less = internals.compare('less', function (value, limit) {
    return value < limit;
});

module.exports = new internals.Number();
