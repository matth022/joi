'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Hoek = require('hoek');

// Declare internals

var internals = {
    Set: require('../../set')
};

internals.Boolean = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'boolean';
        _this._flags.insensitive = true;
        _this._inner.truthySet = new internals.Set();
        _this._inner.falsySet = new internals.Set();
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = {
            value: value
        };

        if (typeof value === 'string' && options.convert) {

            var normalized = this._flags.insensitive ? value.toLowerCase() : value;
            result.value = normalized === 'true' ? true : normalized === 'false' ? false : value;
        }

        if (typeof result.value !== 'boolean') {
            result.value = this._inner.truthySet.has(value, null, null, this._flags.insensitive) ? true : this._inner.falsySet.has(value, null, null, this._flags.insensitive) ? false : value;
        }

        result.errors = typeof result.value === 'boolean' ? null : this.createError('boolean.base', null, state, options);
        return result;
    };

    _class.prototype.truthy = function truthy() {

        var obj = this.clone();
        var values = Hoek.flatten(Array.prototype.slice.call(arguments));
        for (var i = 0; i < values.length; ++i) {
            var value = values[i];

            Hoek.assert(value !== undefined, 'Cannot call truthy with undefined');
            obj._inner.truthySet.add(value);
        }
        return obj;
    };

    _class.prototype.falsy = function falsy() {

        var obj = this.clone();
        var values = Hoek.flatten(Array.prototype.slice.call(arguments));
        for (var i = 0; i < values.length; ++i) {
            var value = values[i];

            Hoek.assert(value !== undefined, 'Cannot call falsy with undefined');
            obj._inner.falsySet.add(value);
        }
        return obj;
    };

    _class.prototype.insensitive = function insensitive(enabled) {

        var insensitive = enabled === undefined ? true : !!enabled;

        if (this._flags.insensitive === insensitive) {
            return this;
        }

        var obj = this.clone();
        obj._flags.insensitive = insensitive;
        return obj;
    };

    _class.prototype.describe = function describe() {

        var description = Any.prototype.describe.call(this);
        description.truthy = [true].concat(this._inner.truthySet.values());
        description.falsy = [false].concat(this._inner.falsySet.values());
        return description;
    };

    return _class;
}(Any);

module.exports = new internals.Boolean();
