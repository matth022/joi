'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Hoek = require('hoek');
var Any = require('../any');
var Cast = require('../../cast');
var Ref = require('../../ref');

// Declare internals

var internals = {};

internals.Alternatives = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'alternatives';
        _this._invalids.remove(null);
        _this._inner.matches = [];
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var errors = [];
        var il = this._inner.matches.length;
        var baseType = this._baseType;

        for (var i = 0; i < il; ++i) {
            var item = this._inner.matches[i];
            var schema = item.schema;
            if (!schema) {
                var failed = item.is._validate(item.ref(state.reference || state.parent, options), null, options, state.parent).errors;

                if (failed) {
                    if (item.otherwise) {
                        return item.otherwise._validate(value, state, options);
                    }
                } else if (item.then) {
                    return item.then._validate(value, state, options);
                }

                if (i === il - 1 && baseType) {
                    return baseType._validate(value, state, options);
                }

                continue;
            }

            var result = schema._validate(value, state, options);
            if (!result.errors) {
                // Found a valid match
                return result;
            }

            errors = errors.concat(result.errors);
        }

        if (errors.length) {
            return { errors: this.createError('alternatives.child', { reason: errors }, state, options) };
        }

        return { errors: this.createError('alternatives.base', null, state, options) };
    };

    _class.prototype.try = function _try() /* schemas */{

        var schemas = Hoek.flatten(Array.prototype.slice.call(arguments));
        Hoek.assert(schemas.length, 'Cannot add other alternatives without at least one schema');

        var obj = this.clone();

        for (var i = 0; i < schemas.length; ++i) {
            var cast = Cast.schema(this._currentJoi, schemas[i]);
            if (cast._refs.length) {
                obj._refs = obj._refs.concat(cast._refs);
            }
            obj._inner.matches.push({ schema: cast });
        }

        return obj;
    };

    _class.prototype.when = function when(ref, options) {

        Hoek.assert(Ref.isRef(ref) || typeof ref === 'string', 'Invalid reference:', ref);
        Hoek.assert(options, 'Missing options');
        Hoek.assert((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object', 'Invalid options');
        Hoek.assert(options.hasOwnProperty('is'), 'Missing "is" directive');
        Hoek.assert(options.then !== undefined || options.otherwise !== undefined, 'options must have at least one of "then" or "otherwise"');

        var obj = this.clone();
        var is = Cast.schema(this._currentJoi, options.is);

        if (options.is === null || !(Ref.isRef(options.is) || options.is instanceof Any)) {

            // Only apply required if this wasn't already a schema or a ref, we'll suppose people know what they're doing
            is = is.required();
        }

        var item = {
            ref: Cast.ref(ref),
            is: is,
            then: options.then !== undefined ? Cast.schema(this._currentJoi, options.then) : undefined,
            otherwise: options.otherwise !== undefined ? Cast.schema(this._currentJoi, options.otherwise) : undefined
        };

        if (obj._baseType) {

            item.then = item.then && obj._baseType.concat(item.then);
            item.otherwise = item.otherwise && obj._baseType.concat(item.otherwise);
        }

        Ref.push(obj._refs, item.ref);
        obj._refs = obj._refs.concat(item.is._refs);

        if (item.then && item.then._refs) {
            obj._refs = obj._refs.concat(item.then._refs);
        }

        if (item.otherwise && item.otherwise._refs) {
            obj._refs = obj._refs.concat(item.otherwise._refs);
        }

        obj._inner.matches.push(item);

        return obj;
    };

    _class.prototype.describe = function describe() {

        var description = Any.prototype.describe.call(this);
        var alternatives = [];
        for (var i = 0; i < this._inner.matches.length; ++i) {
            var item = this._inner.matches[i];
            if (item.schema) {

                // try()

                alternatives.push(item.schema.describe());
            } else {

                // when()

                var when = {
                    ref: item.ref.toString(),
                    is: item.is.describe()
                };

                if (item.then) {
                    when.then = item.then.describe();
                }

                if (item.otherwise) {
                    when.otherwise = item.otherwise.describe();
                }

                alternatives.push(when);
            }
        }

        description.alternatives = alternatives;
        return description;
    };

    return _class;
}(Any);

module.exports = new internals.Alternatives();
