'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Hoek = require('hoek');

// Declare internals

var internals = {};

internals.Lazy = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'lazy';
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = { value: value };
        var lazy = this._flags.lazy;

        if (!lazy) {
            result.errors = this.createError('lazy.base', null, state, options);
            return result;
        }

        var schema = lazy();

        if (!(schema instanceof Any)) {
            result.errors = this.createError('lazy.schema', null, state, options);
            return result;
        }

        return schema._validate(value, state, options);
    };

    _class.prototype.set = function set(fn) {

        Hoek.assert(typeof fn === 'function', 'You must provide a function as first argument');

        var obj = this.clone();
        obj._flags.lazy = fn;
        return obj;
    };

    return _class;
}(Any);

module.exports = new internals.Lazy();
