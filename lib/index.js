'use strict';

// Load modules

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Hoek = require('hoek');
var Any = require('./types/any');
var Cast = require('./cast');
var Errors = require('./errors');
var Lazy = require('./types/lazy');
var Ref = require('./ref');

// Declare internals

var internals = {
    alternatives: require('./types/alternatives'),
    array: require('./types/array'),
    boolean: require('./types/boolean'),
    binary: require('./types/binary'),
    date: require('./types/date'),
    number: require('./types/number'),
    object: require('./types/object'),
    string: require('./types/string')
};

internals.applyDefaults = function (schema) {

    if (this._defaults) {
        schema = this._defaults(schema);
    }

    schema._currentJoi = this;

    return schema;
};

internals.root = function () {

    var any = new Any();

    var root = any.clone();
    Any.prototype._currentJoi = root;

    root.any = function () {

        Hoek.assert(arguments.length === 0, 'Joi.any() does not allow arguments.');

        return internals.applyDefaults.call(this, any);
    };

    root.alternatives = root.alt = function () {

        var alternatives = internals.applyDefaults.call(this, internals.alternatives);
        return arguments.length ? alternatives.try.apply(alternatives, arguments) : alternatives;
    };

    root.array = function () {

        Hoek.assert(arguments.length === 0, 'Joi.array() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.array);
    };

    root.boolean = root.bool = function () {

        Hoek.assert(arguments.length === 0, 'Joi.boolean() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.boolean);
    };

    root.binary = function () {

        Hoek.assert(arguments.length === 0, 'Joi.binary() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.binary);
    };

    root.date = function () {

        Hoek.assert(arguments.length === 0, 'Joi.date() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.date);
    };

    root.func = function () {

        Hoek.assert(arguments.length === 0, 'Joi.func() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.object._func());
    };

    root.number = function () {

        Hoek.assert(arguments.length === 0, 'Joi.number() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.number);
    };

    root.object = function () {

        var object = internals.applyDefaults.call(this, internals.object);
        return arguments.length ? object.keys.apply(object, arguments) : object;
    };

    root.string = function () {

        Hoek.assert(arguments.length === 0, 'Joi.string() does not allow arguments.');

        return internals.applyDefaults.call(this, internals.string);
    };

    root.ref = function () {

        return Ref.create.apply(null, arguments);
    };

    root.isRef = function (ref) {

        return Ref.isRef(ref);
    };

    root.validate = function (value /*, [schema], [options], callback */) {

        var last = arguments[arguments.length - 1];
        var callback = typeof last === 'function' ? last : null;

        var count = arguments.length - (callback ? 1 : 0);
        if (count === 1) {
            return any.validate(value, callback);
        }

        var options = count === 3 ? arguments[2] : {};
        var schema = root.compile(arguments[1]);

        return schema._validateWithOptions(value, options, callback);
    };

    root.describe = function () {

        var schema = arguments.length ? root.compile(arguments[0]) : any;
        return schema.describe();
    };

    root.compile = function (schema) {

        try {
            return Cast.schema(this, schema);
        } catch (err) {
            if (err.hasOwnProperty('path')) {
                err.message = err.message + '(' + err.path + ')';
            }
            throw err;
        }
    };

    root.assert = function (value, schema, message) {

        root.attempt(value, schema, message);
    };

    root.attempt = function (value, schema, message) {

        var result = root.validate(value, schema);
        var error = result.error;
        if (error) {
            if (!message) {
                if (typeof error.annotate === 'function') {
                    error.message = error.annotate();
                }
                throw error;
            }

            if (!(message instanceof Error)) {
                if (typeof error.annotate === 'function') {
                    error.message = message + ' ' + error.annotate();
                }
                throw error;
            }

            throw message;
        }

        return result.value;
    };

    root.reach = function (schema, path) {

        Hoek.assert(schema && schema instanceof Any, 'you must provide a joi schema');
        Hoek.assert(typeof path === 'string', 'path must be a string');

        if (path === '') {
            return schema;
        }

        var parts = path.split('.');
        var children = schema._inner.children;
        if (!children) {
            return;
        }

        var key = parts[0];
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (child.key === key) {
                return this.reach(child.schema, path.substr(key.length + 1));
            }
        }
    };

    root.lazy = function (fn) {

        return Lazy.set(fn);
    };

    root.defaults = function (fn) {
        var _this = this;

        Hoek.assert(typeof fn === 'function', 'Defaults must be a function');

        var joi = Object.create(this.any());
        joi = fn(joi);

        Hoek.assert(joi && joi instanceof this.constructor, 'defaults() must return a schema');

        Object.assign(joi, this, joi.clone()); // Re-add the types from `this` but also keep the settings from joi's potential new defaults

        joi._defaults = function (schema) {

            if (_this._defaults) {
                schema = _this._defaults(schema);
                Hoek.assert(schema instanceof _this.constructor, 'defaults() must return a schema');
            }

            schema = fn(schema);
            Hoek.assert(schema instanceof _this.constructor, 'defaults() must return a schema');
            return schema;
        };

        return joi;
    };

    root.extend = function () {
        var _this2 = this;

        var extensions = Hoek.flatten(Array.prototype.slice.call(arguments));
        Hoek.assert(extensions.length > 0, 'You need to provide at least one extension');

        this.assert(extensions, root.extensionsSchema);

        var joi = Object.create(this.any());
        Object.assign(joi, this);

        var _loop = function _loop(i) {
            var extension = extensions[i];

            if (typeof extension === 'function') {
                extension = extension(joi);
            }

            _this2.assert(extension, root.extensionSchema);

            var base = (extension.base || _this2.any()).clone(); // Cloning because we're going to override language afterwards
            var ctor = base.constructor;
            var type = function (_ctor) {
                _inherits(type, _ctor);

                // eslint-disable-line no-loop-func

                function type() {
                    _classCallCheck(this, type);

                    var _this3 = _possibleConstructorReturn(this, _ctor.call(this));

                    if (extension.base) {
                        Object.assign(_this3, base);
                    }

                    _this3._type = extension.name;

                    if (extension.language) {
                        var _Hoek$applyToDefaults;

                        _this3._settings = _this3._settings || { language: {} };
                        _this3._settings.language = Hoek.applyToDefaults(_this3._settings.language, (_Hoek$applyToDefaults = {}, _Hoek$applyToDefaults[extension.name] = extension.language, _Hoek$applyToDefaults));
                    }
                    return _this3;
                }

                return type;
            }(ctor);

            if (extension.coerce) {
                type.prototype._coerce = function (value, state, options) {

                    if (ctor.prototype._coerce) {
                        var baseRet = ctor.prototype._coerce.call(this, value, state, options);

                        if (baseRet.errors) {
                            return baseRet;
                        }

                        value = baseRet.value;
                    }

                    var ret = extension.coerce.call(this, value, state, options);
                    if (ret instanceof Errors.Err) {
                        return { value: value, errors: ret };
                    }

                    return { value: ret };
                };
            }
            if (extension.pre) {
                type.prototype._base = function (value, state, options) {

                    if (ctor.prototype._base) {
                        var baseRet = ctor.prototype._base.call(this, value, state, options);

                        if (baseRet.errors) {
                            return baseRet;
                        }

                        value = baseRet.value;
                    }

                    var ret = extension.pre.call(this, value, state, options);
                    if (ret instanceof Errors.Err) {
                        return { value: value, errors: ret };
                    }

                    return { value: ret };
                };
            }

            if (extension.rules) {
                var _loop2 = function _loop2(j) {
                    var rule = extension.rules[j];
                    var ruleArgs = rule.params ? rule.params instanceof Any ? rule.params._inner.children.map(function (k) {
                        return k.key;
                    }) : Object.keys(rule.params) : [];
                    var validateArgs = rule.params ? Cast.schema(_this2, rule.params) : null;

                    type.prototype[rule.name] = function () {
                        // eslint-disable-line no-loop-func

                        if (arguments.length > ruleArgs.length) {
                            throw new Error('Unexpected number of arguments');
                        }

                        var args = Array.prototype.slice.call(arguments);
                        var hasRef = false;
                        var arg = {};

                        for (var k = 0; k < ruleArgs.length; ++k) {
                            arg[ruleArgs[k]] = args[k];
                            if (!hasRef && Ref.isRef(args[k])) {
                                hasRef = true;
                            }
                        }

                        if (validateArgs) {
                            arg = joi.attempt(arg, validateArgs);
                        }

                        var schema = void 0;
                        if (rule.validate) {
                            var validate = function validate(value, state, options) {

                                return rule.validate.call(this, arg, value, state, options);
                            };

                            schema = this._test(rule.name, arg, validate, {
                                description: rule.description,
                                hasRef: hasRef
                            });
                        } else {
                            schema = this.clone();
                        }

                        if (rule.setup) {
                            var newSchema = rule.setup.call(schema, arg);
                            if (newSchema !== undefined) {
                                Hoek.assert(newSchema instanceof Any, 'Setup of extension Joi.' + this._type + '().' + rule.name + '() must return undefined or a Joi object');
                                schema = newSchema;
                            }
                        }

                        return schema;
                    };
                };

                for (var j = 0; j < extension.rules.length; ++j) {
                    _loop2(j);
                }
            }

            if (extension.describe) {
                type.prototype.describe = function () {

                    var description = ctor.prototype.describe.call(this);
                    return extension.describe.call(this, description);
                };
            }

            var instance = new type();
            joi[extension.name] = function () {

                return internals.applyDefaults.call(this, instance);
            };
        };

        for (var i = 0; i < extensions.length; ++i) {
            _loop(i);
        }

        return joi;
    };

    root.extensionSchema = internals.object.keys({
        base: internals.object.type(Any, 'Joi object'),
        name: internals.string.required(),
        coerce: internals.object._func().arity(3),
        pre: internals.object._func().arity(3),
        language: internals.object,
        describe: internals.object._func().arity(1),
        rules: internals.array.items(internals.object.keys({
            name: internals.string.required(),
            setup: internals.object._func().arity(1),
            validate: internals.object._func().arity(4),
            params: [internals.object.pattern(/.*/, internals.object.type(Any, 'Joi object')), internals.object.type(internals.object.constructor, 'Joi object')],
            description: [internals.string, internals.object._func().arity(1)]
        }).or('setup', 'validate'))
    }).strict();

    root.extensionsSchema = internals.array.items([internals.object, internals.object._func().arity(1)]).strict();

    root.version = require('../package.json').version;

    return root;
};

module.exports = internals.root();
