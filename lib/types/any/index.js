'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Hoek = require('hoek');
var Ref = require('../../ref');
var Errors = require('../../errors');
var Alternatives = null; // Delay-loaded to prevent circular dependencies
var Cast = null;

// Declare internals

var internals = {
    Set: require('../../set')
};

internals.defaults = {
    abortEarly: true,
    convert: true,
    allowUnknown: false,
    skipFunctions: false,
    stripUnknown: false,
    language: {},
    presence: 'optional',
    strip: false,
    noDefaults: false

    // context: null
};

module.exports = internals.Any = function () {
    function _class() {
        _classCallCheck(this, _class);

        Cast = Cast || require('../../cast');

        this.isJoi = true;
        this._type = 'any';
        this._settings = null;
        this._valids = new internals.Set();
        this._invalids = new internals.Set();
        this._tests = [];
        this._refs = [];
        this._flags = {
            /*
             presence: 'optional',                   // optional, required, forbidden, ignore
             allowOnly: false,
             allowUnknown: undefined,
             default: undefined,
             forbidden: false,
             encoding: undefined,
             insensitive: false,
             trim: false,
             case: undefined,                        // upper, lower
             empty: undefined,
             func: false,
             raw: false
             */
        };

        this._description = null;
        this._unit = null;
        this._notes = [];
        this._tags = [];
        this._examples = [];
        this._meta = [];

        this._inner = {}; // Hash of arrays of immutable objects
    }

    _class.prototype.createError = function createError(type, context, state, options) {

        return Errors.create(type, context, state, options, this._flags);
    };

    _class.prototype.createOverrideError = function createOverrideError(type, context, state, options, message, template) {

        return Errors.create(type, context, state, options, this._flags, message, template);
    };

    _class.prototype.checkOptions = function checkOptions(options) {

        var Schemas = require('../../schemas');
        var result = Schemas.options.validate(options);
        if (result.error) {
            throw new Error(result.error.details[0].message);
        }
    };

    _class.prototype.clone = function clone() {

        var obj = Object.create(Object.getPrototypeOf(this));

        obj.isJoi = true;
        obj._currentJoi = this._currentJoi;
        obj._type = this._type;
        obj._settings = internals.concatSettings(this._settings);
        obj._baseType = this._baseType;
        obj._valids = Hoek.clone(this._valids);
        obj._invalids = Hoek.clone(this._invalids);
        obj._tests = this._tests.slice();
        obj._refs = this._refs.slice();
        obj._flags = Hoek.clone(this._flags);

        obj._description = this._description;
        obj._unit = this._unit;
        obj._notes = this._notes.slice();
        obj._tags = this._tags.slice();
        obj._examples = this._examples.slice();
        obj._meta = this._meta.slice();

        obj._inner = {};
        var inners = Object.keys(this._inner);
        for (var i = 0; i < inners.length; ++i) {
            var key = inners[i];
            obj._inner[key] = this._inner[key] ? this._inner[key].slice() : null;
        }

        return obj;
    };

    _class.prototype.concat = function concat(schema) {

        Hoek.assert(schema instanceof internals.Any, 'Invalid schema object');
        Hoek.assert(this._type === 'any' || schema._type === 'any' || schema._type === this._type, 'Cannot merge type', this._type, 'with another type:', schema._type);

        var obj = this.clone();

        if (this._type === 'any' && schema._type !== 'any') {

            // Reset values as if we were "this"
            var tmpObj = schema.clone();
            var keysToRestore = ['_settings', '_valids', '_invalids', '_tests', '_refs', '_flags', '_description', '_unit', '_notes', '_tags', '_examples', '_meta', '_inner'];

            for (var i = 0; i < keysToRestore.length; ++i) {
                tmpObj[keysToRestore[i]] = obj[keysToRestore[i]];
            }

            obj = tmpObj;
        }

        obj._settings = obj._settings ? internals.concatSettings(obj._settings, schema._settings) : schema._settings;
        obj._valids.merge(schema._valids, schema._invalids);
        obj._invalids.merge(schema._invalids, schema._valids);
        obj._tests = obj._tests.concat(schema._tests);
        obj._refs = obj._refs.concat(schema._refs);
        Hoek.merge(obj._flags, schema._flags);

        obj._description = schema._description || obj._description;
        obj._unit = schema._unit || obj._unit;
        obj._notes = obj._notes.concat(schema._notes);
        obj._tags = obj._tags.concat(schema._tags);
        obj._examples = obj._examples.concat(schema._examples);
        obj._meta = obj._meta.concat(schema._meta);

        var inners = Object.keys(schema._inner);
        var isObject = obj._type === 'object';
        for (var _i = 0; _i < inners.length; ++_i) {
            var key = inners[_i];
            var source = schema._inner[key];
            if (source) {
                var target = obj._inner[key];
                if (target) {
                    if (isObject && key === 'children') {
                        var keys = {};

                        for (var j = 0; j < target.length; ++j) {
                            keys[target[j].key] = j;
                        }

                        for (var _j = 0; _j < source.length; ++_j) {
                            var sourceKey = source[_j].key;
                            if (keys[sourceKey] >= 0) {
                                target[keys[sourceKey]] = {
                                    key: sourceKey,
                                    schema: target[keys[sourceKey]].schema.concat(source[_j].schema)
                                };
                            } else {
                                target.push(source[_j]);
                            }
                        }
                    } else {
                        obj._inner[key] = obj._inner[key].concat(source);
                    }
                } else {
                    obj._inner[key] = source.slice();
                }
            }
        }

        return obj;
    };

    _class.prototype._test = function _test(name, arg, func, options) {

        var obj = this.clone();
        obj._tests.push({ func: func, name: name, arg: arg, options: options });
        return obj;
    };

    _class.prototype.options = function options(_options) {

        Hoek.assert(!_options.context, 'Cannot override context');
        this.checkOptions(_options);

        var obj = this.clone();
        obj._settings = internals.concatSettings(obj._settings, _options);
        return obj;
    };

    _class.prototype.strict = function strict(isStrict) {

        var obj = this.clone();
        obj._settings = obj._settings || {};
        obj._settings.convert = isStrict === undefined ? false : !isStrict;
        return obj;
    };

    _class.prototype.raw = function raw(isRaw) {

        var value = isRaw === undefined ? true : isRaw;

        if (this._flags.raw === value) {
            return this;
        }

        var obj = this.clone();
        obj._flags.raw = value;
        return obj;
    };

    _class.prototype.error = function error(err) {

        Hoek.assert(err && (err instanceof Error || typeof err === 'function'), 'Must provide a valid Error object or a function');

        var obj = this.clone();
        obj._flags.error = err;
        return obj;
    };

    _class.prototype.allow = function allow() {

        var obj = this.clone();
        var values = Hoek.flatten(Array.prototype.slice.call(arguments));
        for (var i = 0; i < values.length; ++i) {
            var value = values[i];

            Hoek.assert(value !== undefined, 'Cannot call allow/valid/invalid with undefined');
            obj._invalids.remove(value);
            obj._valids.add(value, obj._refs);
        }
        return obj;
    };

    _class.prototype.valid = function valid() {

        var obj = this.allow.apply(this, arguments);
        obj._flags.allowOnly = true;
        return obj;
    };

    _class.prototype.invalid = function invalid(value) {

        var obj = this.clone();
        var values = Hoek.flatten(Array.prototype.slice.call(arguments));
        for (var i = 0; i < values.length; ++i) {
            value = values[i];

            Hoek.assert(value !== undefined, 'Cannot call allow/valid/invalid with undefined');
            obj._valids.remove(value);
            obj._invalids.add(value, this._refs);
        }

        return obj;
    };

    _class.prototype.required = function required() {

        if (this._flags.presence === 'required') {
            return this;
        }

        var obj = this.clone();
        obj._flags.presence = 'required';
        return obj;
    };

    _class.prototype.optional = function optional() {

        if (this._flags.presence === 'optional') {
            return this;
        }

        var obj = this.clone();
        obj._flags.presence = 'optional';
        return obj;
    };

    _class.prototype.forbidden = function forbidden() {

        if (this._flags.presence === 'forbidden') {
            return this;
        }

        var obj = this.clone();
        obj._flags.presence = 'forbidden';
        return obj;
    };

    _class.prototype.strip = function strip() {

        if (this._flags.strip) {
            return this;
        }

        var obj = this.clone();
        obj._flags.strip = true;
        return obj;
    };

    _class.prototype.applyFunctionToChildren = function applyFunctionToChildren(children, fn, args, root) {

        children = [].concat(children);

        if (children.length !== 1 || children[0] !== '') {
            root = root ? root + '.' : '';

            var extraChildren = (children[0] === '' ? children.slice(1) : children).map(function (child) {

                return root + child;
            });

            throw new Error('unknown key(s) ' + extraChildren.join(', '));
        }

        return this[fn].apply(this, args);
    };

    _class.prototype.default = function _default(value, description) {

        if (typeof value === 'function' && !Ref.isRef(value)) {

            if (!value.description && description) {

                value.description = description;
            }

            if (!this._flags.func) {
                Hoek.assert(typeof value.description === 'string' && value.description.length > 0, 'description must be provided when default value is a function');
            }
        }

        var obj = this.clone();
        obj._flags.default = value;
        Ref.push(obj._refs, value);
        return obj;
    };

    _class.prototype.empty = function empty(schema) {

        var obj = this.clone();
        obj._flags.empty = schema === undefined ? undefined : Cast.schema(this._currentJoi, schema);
        return obj;
    };

    _class.prototype.when = function when(ref, options) {

        Hoek.assert(options && (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object', 'Invalid options');
        Hoek.assert(options.then !== undefined || options.otherwise !== undefined, 'options must have at least one of "then" or "otherwise"');

        var then = options.hasOwnProperty('then') ? this.concat(Cast.schema(this._currentJoi, options.then)) : undefined;
        var otherwise = options.hasOwnProperty('otherwise') ? this.concat(Cast.schema(this._currentJoi, options.otherwise)) : undefined;

        Alternatives = Alternatives || require('../alternatives');
        var obj = Alternatives.when(ref, { is: options.is, then: then, otherwise: otherwise });
        obj._flags.presence = 'ignore';
        obj._baseType = this;

        return obj;
    };

    _class.prototype.description = function description(desc) {

        Hoek.assert(desc && typeof desc === 'string', 'Description must be a non-empty string');

        var obj = this.clone();
        obj._description = desc;
        return obj;
    };

    _class.prototype.notes = function notes(_notes) {

        Hoek.assert(_notes && (typeof _notes === 'string' || Array.isArray(_notes)), 'Notes must be a non-empty string or array');

        var obj = this.clone();
        obj._notes = obj._notes.concat(_notes);
        return obj;
    };

    _class.prototype.tags = function tags(_tags) {

        Hoek.assert(_tags && (typeof _tags === 'string' || Array.isArray(_tags)), 'Tags must be a non-empty string or array');

        var obj = this.clone();
        obj._tags = obj._tags.concat(_tags);
        return obj;
    };

    _class.prototype.meta = function meta(_meta) {

        Hoek.assert(_meta !== undefined, 'Meta cannot be undefined');

        var obj = this.clone();
        obj._meta = obj._meta.concat(_meta);
        return obj;
    };

    _class.prototype.example = function example(value) {

        Hoek.assert(arguments.length, 'Missing example');
        var result = this._validate(value, null, internals.defaults);
        Hoek.assert(!result.errors, 'Bad example:', result.errors && Errors.process(result.errors, value));

        var obj = this.clone();
        obj._examples.push(value);
        return obj;
    };

    _class.prototype.unit = function unit(name) {

        Hoek.assert(name && typeof name === 'string', 'Unit name must be a non-empty string');

        var obj = this.clone();
        obj._unit = name;
        return obj;
    };

    _class.prototype._prepareEmptyValue = function _prepareEmptyValue(value) {

        if (typeof value === 'string' && this._flags.trim) {
            return value.trim();
        }

        return value;
    };

    _class.prototype._validate = function _validate(value, state, options, reference) {
        var _this = this;

        var originalValue = value;

        // Setup state and settings

        state = state || { key: '', path: '', parent: null, reference: reference };

        if (this._settings) {
            options = internals.concatSettings(options, this._settings);
        }

        var errors = [];
        var finish = function finish() {

            var finalValue = void 0;

            if (value !== undefined) {
                finalValue = _this._flags.raw ? originalValue : value;
            } else if (options.noDefaults) {
                finalValue = value;
            } else if (Ref.isRef(_this._flags.default)) {
                finalValue = _this._flags.default(state.parent, options);
            } else if (typeof _this._flags.default === 'function' && !(_this._flags.func && !_this._flags.default.description)) {

                var args = void 0;

                if (state.parent !== null && _this._flags.default.length > 0) {

                    args = [Hoek.clone(state.parent), options];
                }

                var defaultValue = internals._try(_this._flags.default, args);
                finalValue = defaultValue.value;
                if (defaultValue.error) {
                    errors.push(_this.createError('any.default', defaultValue.error, state, options));
                }
            } else {
                finalValue = Hoek.clone(_this._flags.default);
            }

            if (errors.length && typeof _this._flags.error === 'function') {
                var change = _this._flags.error.call(_this, errors);

                if (typeof change === 'string') {
                    errors = [_this.createOverrideError('override', { reason: errors }, state, options, change)];
                } else {
                    errors = [].concat(change).map(function (err) {

                        return err instanceof Error ? err : _this.createOverrideError(err.type || 'override', err.context, state, options, err.message, err.template);
                    });
                }
            }

            return {
                value: _this._flags.strip ? undefined : finalValue,
                finalValue: finalValue,
                errors: errors.length ? errors : null
            };
        };

        if (this._coerce) {
            var coerced = this._coerce.call(this, value, state, options);
            if (coerced.errors) {
                value = coerced.value;
                errors = errors.concat(coerced.errors);
                return finish(); // Coerced error always aborts early
            }

            value = coerced.value;
        }

        if (this._flags.empty && !this._flags.empty._validate(this._prepareEmptyValue(value), null, internals.defaults).errors) {
            value = undefined;
        }

        // Check presence requirements

        var presence = this._flags.presence || options.presence;
        if (presence === 'optional') {
            if (value === undefined) {
                var isDeepDefault = this._flags.hasOwnProperty('default') && this._flags.default === undefined;
                if (isDeepDefault && this._type === 'object') {
                    value = {};
                } else {
                    return finish();
                }
            }
        } else if (presence === 'required' && value === undefined) {

            errors.push(this.createError('any.required', null, state, options));
            return finish();
        } else if (presence === 'forbidden') {
            if (value === undefined) {
                return finish();
            }

            errors.push(this.createError('any.unknown', null, state, options));
            return finish();
        }

        // Check allowed and denied values using the original value

        if (this._valids.has(value, state, options, this._flags.insensitive)) {
            return finish();
        }

        if (this._invalids.has(value, state, options, this._flags.insensitive)) {
            errors.push(this.createError(value === '' ? 'any.empty' : 'any.invalid', null, state, options));
            if (options.abortEarly || value === undefined) {
                // No reason to keep validating missing value

                return finish();
            }
        }

        // Convert value and validate type

        if (this._base) {
            var base = this._base.call(this, value, state, options);
            if (base.errors) {
                value = base.value;
                errors = errors.concat(base.errors);
                return finish(); // Base error always aborts early
            }

            if (base.value !== value) {
                value = base.value;

                // Check allowed and denied values using the converted value

                if (this._valids.has(value, state, options, this._flags.insensitive)) {
                    return finish();
                }

                if (this._invalids.has(value, state, options, this._flags.insensitive)) {
                    errors.push(this.createError(value === '' ? 'any.empty' : 'any.invalid', null, state, options));
                    if (options.abortEarly) {
                        return finish();
                    }
                }
            }
        }

        // Required values did not match

        if (this._flags.allowOnly) {
            errors.push(this.createError('any.allowOnly', { valids: this._valids.values({ stripUndefined: true }) }, state, options));
            if (options.abortEarly) {
                return finish();
            }
        }

        // Helper.validate tests

        for (var i = 0; i < this._tests.length; ++i) {
            var test = this._tests[i];
            var ret = test.func.call(this, value, state, options);
            if (ret instanceof Errors.Err) {
                errors.push(ret);
                if (options.abortEarly) {
                    return finish();
                }
            } else {
                value = ret;
            }
        }

        return finish();
    };

    _class.prototype._validateWithOptions = function _validateWithOptions(value, options, callback) {

        if (options) {
            this.checkOptions(options);
        }

        var settings = internals.concatSettings(internals.defaults, options);
        var result = this._validate(value, null, settings);
        var errors = Errors.process(result.errors, value);

        if (callback) {
            return callback(errors, result.value);
        }

        return { error: errors, value: result.value };
    };

    _class.prototype.validate = function validate(value, options, callback) {

        if (typeof options === 'function') {
            return this._validateWithOptions(value, null, options);
        }

        return this._validateWithOptions(value, options, callback);
    };

    _class.prototype.describe = function describe() {
        var _this2 = this;

        var description = {
            type: this._type
        };

        var flags = Object.keys(this._flags);
        if (flags.length) {
            if (['empty', 'default', 'lazy', 'label'].some(function (flag) {
                return _this2._flags.hasOwnProperty(flag);
            })) {
                description.flags = {};
                for (var i = 0; i < flags.length; ++i) {
                    var flag = flags[i];
                    if (flag === 'empty') {
                        description.flags[flag] = this._flags[flag].describe();
                    } else if (flag === 'default') {
                        if (Ref.isRef(this._flags[flag])) {
                            description.flags[flag] = this._flags[flag].toString();
                        } else if (typeof this._flags[flag] === 'function') {
                            description.flags[flag] = {
                                description: this._flags[flag].description,
                                function: this._flags[flag]
                            };
                        } else {
                            description.flags[flag] = this._flags[flag];
                        }
                    } else if (flag === 'lazy' || flag === 'label') {
                        // We don't want it in the description
                    } else {
                        description.flags[flag] = this._flags[flag];
                    }
                }
            } else {
                description.flags = this._flags;
            }
        }

        if (this._settings) {
            description.options = Hoek.clone(this._settings);
        }

        if (this._baseType) {
            description.base = this._baseType.describe();
        }

        if (this._description) {
            description.description = this._description;
        }

        if (this._notes.length) {
            description.notes = this._notes;
        }

        if (this._tags.length) {
            description.tags = this._tags;
        }

        if (this._meta.length) {
            description.meta = this._meta;
        }

        if (this._examples.length) {
            description.examples = this._examples;
        }

        if (this._unit) {
            description.unit = this._unit;
        }

        var valids = this._valids.values();
        if (valids.length) {
            description.valids = valids.map(function (v) {

                return Ref.isRef(v) ? v.toString() : v;
            });
        }

        var invalids = this._invalids.values();
        if (invalids.length) {
            description.invalids = invalids.map(function (v) {

                return Ref.isRef(v) ? v.toString() : v;
            });
        }

        description.rules = [];

        for (var _i2 = 0; _i2 < this._tests.length; ++_i2) {
            var validator = this._tests[_i2];
            var item = { name: validator.name };

            if (validator.arg !== void 0) {
                item.arg = Ref.isRef(validator.arg) ? validator.arg.toString() : validator.arg;
            }

            var options = validator.options;
            if (options) {
                if (options.hasRef) {
                    item.arg = {};
                    var keys = Object.keys(validator.arg);
                    for (var j = 0; j < keys.length; ++j) {
                        var key = keys[j];
                        var value = validator.arg[key];
                        item.arg[key] = Ref.isRef(value) ? value.toString() : value;
                    }
                }

                if (typeof options.description === 'string') {
                    item.description = options.description;
                } else if (typeof options.description === 'function') {
                    item.description = options.description(item.arg);
                }
            }

            description.rules.push(item);
        }

        if (!description.rules.length) {
            delete description.rules;
        }

        var label = this._getLabel();
        if (label) {
            description.label = label;
        }

        return description;
    };

    _class.prototype.label = function label(name) {

        Hoek.assert(name && typeof name === 'string', 'Label name must be a non-empty string');

        var obj = this.clone();
        obj._flags.label = name;
        return obj;
    };

    _class.prototype._getLabel = function _getLabel(def) {

        return this._flags.label || def;
    };

    _createClass(_class, [{
        key: 'type',
        get: function get() {

            return this._type;
        }
    }]);

    return _class;
}();

internals.Any.prototype.isImmutable = true; // Prevents Hoek from deep cloning schema objects

// Aliases

internals.Any.prototype.only = internals.Any.prototype.equal = internals.Any.prototype.valid;
internals.Any.prototype.disallow = internals.Any.prototype.not = internals.Any.prototype.invalid;
internals.Any.prototype.exist = internals.Any.prototype.required;

internals._try = function (fn, args) {

    var err = void 0;
    var result = void 0;

    try {
        result = fn.apply(null, args);
    } catch (e) {
        err = e;
    }

    return {
        value: result,
        error: err
    };
};

internals.concatSettings = function (target, source) {

    // Used to avoid cloning context

    if (!target && !source) {

        return null;
    }

    var obj = {};

    if (target) {
        Object.assign(obj, target);
    }

    if (source) {
        var sKeys = Object.keys(source);
        for (var i = 0; i < sKeys.length; ++i) {
            var key = sKeys[i];
            if (key !== 'language' || !obj.hasOwnProperty(key)) {

                obj[key] = source[key];
            } else {
                obj[key] = Hoek.applyToDefaults(obj[key], source[key]);
            }
        }
    }

    return obj;
};
