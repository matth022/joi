'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Hoek = require('hoek');
var Language = require('./language');

// Declare internals

var internals = {
    annotations: Symbol('joi-annotations')
};

internals.stringify = function (value, wrapArrays) {

    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

    if (value === null) {
        return 'null';
    }

    if (type === 'string') {
        return value;
    }

    if (value instanceof exports.Err || type === 'function') {
        return value.toString();
    }

    if (type === 'object') {
        if (Array.isArray(value)) {
            var partial = '';

            for (var i = 0; i < value.length; ++i) {
                partial = partial + (partial.length ? ', ' : '') + internals.stringify(value[i], wrapArrays);
            }

            return wrapArrays ? '[' + partial + ']' : partial;
        }

        return value.toString();
    }

    return JSON.stringify(value);
};

exports.Err = function () {
    function _class(type, context, state, options, flags, message, template) {
        _classCallCheck(this, _class);

        this.isJoi = true;
        this.type = type;
        this.context = context || {};
        this.context.key = state.key;
        this.path = state.path;
        this.options = options;
        this.flags = flags;
        this.message = message;
        this.template = template;
    }

    _class.prototype.toString = function toString() {
        var _this = this;

        if (this.message) {
            return this.message;
        }

        var format = void 0;

        if (this.template) {
            format = this.template;
        }

        var localized = this.options.language;

        if (this.flags.label) {
            this.context.key = this.flags.label;
        } else if (this.context.key === '' || this.context.key === null) {
            this.context.key = localized.root || Language.errors.root;
        }

        format = format || Hoek.reach(localized, this.type) || Hoek.reach(Language.errors, this.type);

        var wrapArrays = Hoek.reach(localized, 'messages.wrapArrays');
        if (typeof wrapArrays !== 'boolean') {
            wrapArrays = Language.errors.messages.wrapArrays;
        }

        if (format === null) {
            var childrenString = internals.stringify(this.context.reason, wrapArrays);
            if (wrapArrays) {
                return childrenString.slice(1, -1);
            }
            return childrenString;
        }

        var hasKey = /\{\{\!?key\}\}/.test(format);
        var skipKey = format.length > 2 && format[0] === '!' && format[1] === '!';

        if (skipKey) {
            format = format.slice(2);
        }

        if (!hasKey && !skipKey) {
            format = (Hoek.reach(localized, 'key') || Hoek.reach(Language.errors, 'key')) + format;
        }

        return format.replace(/\{\{(\!?)([^}]+)\}\}/g, function ($0, isSecure, name) {

            var value = Hoek.reach(_this.context, name);
            var normalized = internals.stringify(value, wrapArrays);
            return isSecure ? Hoek.escapeHtml(normalized) : normalized;
        });
    };

    return _class;
}();

exports.create = function (type, context, state, options, flags, message, template) {

    return new exports.Err(type, context, state, options, flags, message, template);
};

exports.process = function (errors, object) {

    if (!errors || !errors.length) {
        return null;
    }

    // Construct error

    var message = '';
    var details = [];

    var processErrors = function processErrors(localErrors, parent) {

        for (var i = 0; i < localErrors.length; ++i) {
            var item = localErrors[i];

            if (item instanceof Error) {
                return item;
            }

            if (item.flags.error && typeof item.flags.error !== 'function') {
                return item.flags.error;
            }

            var itemMessage = void 0;
            if (parent === undefined) {
                itemMessage = item.toString();
                message = message + (message ? '. ' : '') + itemMessage;
            }

            // Do not push intermediate errors, we're only interested in leafs

            if (item.context.reason && item.context.reason.length) {
                var _override = processErrors(item.context.reason, item.path);
                if (_override) {
                    return _override;
                }
            } else {
                details.push({
                    message: itemMessage || item.toString(),
                    path: internals.getPath(item),
                    type: item.type,
                    context: item.context
                });
            }
        }
    };

    var override = processErrors(errors);
    if (override) {
        return override;
    }

    var error = new Error(message);
    error.isJoi = true;
    error.name = 'ValidationError';
    error.details = details;
    error._object = object;
    error.annotate = internals.annotate;
    return error;
};

internals.getPath = function (item) {

    return item.path || item.context.key;
};

// Inspired by json-stringify-safe
internals.safeStringify = function (obj, spaces) {

    return JSON.stringify(obj, internals.serializer(), spaces);
};

internals.serializer = function () {

    var keys = [];
    var stack = [];

    var cycleReplacer = function cycleReplacer(key, value) {

        if (stack[0] === value) {
            return '[Circular ~]';
        }

        return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
    };

    return function (key, value) {

        if (stack.length > 0) {
            var thisPos = stack.indexOf(this);
            if (~thisPos) {
                stack.length = thisPos + 1;
                keys.length = thisPos + 1;
                keys[thisPos] = key;
            } else {
                stack.push(this);
                keys.push(key);
            }

            if (~stack.indexOf(value)) {
                value = cycleReplacer.call(this, key, value);
            }
        } else {
            stack.push(value);
        }

        if (value) {
            var annotations = value[internals.annotations];
            if (annotations) {
                if (Array.isArray(value)) {
                    var annotated = [];

                    for (var i = 0; i < value.length; ++i) {
                        if (annotations.errors[i]) {
                            annotated.push('_$idx$_' + annotations.errors[i].sort().join(', ') + '_$end$_');
                        }
                        annotated.push(value[i]);
                    }

                    value = annotated;
                } else {
                    var errorKeys = Object.keys(annotations.errors);
                    for (var _i = 0; _i < errorKeys.length; ++_i) {
                        var errorKey = errorKeys[_i];
                        value[errorKey + '_$key$_' + annotations.errors[errorKey].sort().join(', ') + '_$end$_'] = value[errorKey];
                        value[errorKey] = undefined;
                    }

                    var missingKeys = Object.keys(annotations.missing);
                    for (var _i2 = 0; _i2 < missingKeys.length; ++_i2) {
                        var missingKey = missingKeys[_i2];
                        value['_$miss$_' + missingKey + '|' + annotations.missing[missingKey] + '_$end$_'] = '__missing__';
                    }
                }

                return value;
            }
        }

        if (value === Infinity || value === -Infinity || Number.isNaN(value) || typeof value === 'function' || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'symbol') {
            return '[' + value.toString() + ']';
        }

        return value;
    };
};

internals.annotate = function (stripColorCodes) {

    var redFgEscape = stripColorCodes ? '' : '\x1B[31m';
    var redBgEscape = stripColorCodes ? '' : '\x1B[41m';
    var endColor = stripColorCodes ? '' : '\x1B[0m';

    if (_typeof(this._object) !== 'object') {
        return this.details[0].message;
    }

    var obj = Hoek.clone(this._object || {});

    for (var i = this.details.length - 1; i >= 0; --i) {
        // Reverse order to process deepest child first
        var pos = i + 1;
        var error = this.details[i];
        var path = error.path.split('.');
        var ref = obj;
        for (var j = 0;; ++j) {
            var seg = path[j];

            if (ref.isImmutable) {
                ref = ref.clone(); // joi schemas are not cloned by hoek, we have to take this extra step
            }

            if (j + 1 < path.length && ref[seg] && typeof ref[seg] !== 'string') {

                ref = ref[seg];
            } else {
                var refAnnotations = ref[internals.annotations] = ref[internals.annotations] || { errors: {}, missing: {} };
                var value = ref[seg];

                if (value !== undefined) {
                    refAnnotations.errors[seg] = refAnnotations.errors[seg] || [];
                    refAnnotations.errors[seg].push(pos);
                } else {
                    refAnnotations.missing[seg] = pos;
                }

                break;
            }
        }
    }

    var replacers = {
        key: /_\$key\$_([, \d]+)_\$end\$_\"/g,
        missing: /\"_\$miss\$_([^\|]+)\|(\d+)_\$end\$_\"\: \"__missing__\"/g,
        arrayIndex: /\s*\"_\$idx\$_([, \d]+)_\$end\$_\",?\n(.*)/g,
        specials: /"\[(NaN|Symbol.*|-?Infinity|function.*|\(.*)\]"/g
    };

    var message = internals.safeStringify(obj, 2).replace(replacers.key, function ($0, $1) {
        return '" ' + redFgEscape + '[' + $1 + ']' + endColor;
    }).replace(replacers.missing, function ($0, $1, $2) {
        return redBgEscape + '"' + $1 + '"' + endColor + redFgEscape + ' [' + $2 + ']: -- missing --' + endColor;
    }).replace(replacers.arrayIndex, function ($0, $1, $2) {
        return '\n' + $2 + ' ' + redFgEscape + '[' + $1 + ']' + endColor;
    }).replace(replacers.specials, function ($0, $1) {
        return $1;
    });

    message = message + '\n' + redFgEscape;

    for (var _i3 = 0; _i3 < this.details.length; ++_i3) {
        var _pos = _i3 + 1;
        message = message + '\n[' + _pos + '] ' + this.details[_i3].message;
    }

    message = message + endColor;

    return message;
};
