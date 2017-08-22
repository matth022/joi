'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Any = require('../any');
var Cast = require('../../cast');
var Ref = require('../../ref');
var Hoek = require('hoek');

// Declare internals

var internals = {};

internals.fastSplice = function (arr, i) {

    var pos = i;
    while (pos < arr.length) {
        arr[pos++] = arr[pos];
    }

    --arr.length;
};

internals.Array = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'array';
        _this._inner.items = [];
        _this._inner.ordereds = [];
        _this._inner.inclusions = [];
        _this._inner.exclusions = [];
        _this._inner.requireds = [];
        _this._flags.sparse = false;
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var result = {
            value: value
        };

        if (typeof value === 'string' && options.convert) {

            internals.safeParse(value, result);
        }

        var isArray = Array.isArray(result.value);
        var wasArray = isArray;
        if (options.convert && this._flags.single && !isArray) {
            result.value = [result.value];
            isArray = true;
        }

        if (!isArray) {
            result.errors = this.createError('array.base', null, state, options);
            return result;
        }

        if (this._inner.inclusions.length || this._inner.exclusions.length || this._inner.requireds.length || this._inner.ordereds.length || !this._flags.sparse) {

            // Clone the array so that we don't modify the original
            if (wasArray) {
                result.value = result.value.slice(0);
            }

            result.errors = this._checkItems.call(this, result.value, wasArray, state, options);

            if (result.errors && wasArray && options.convert && this._flags.single) {

                // Attempt a 2nd pass by putting the array inside one.
                var previousErrors = result.errors;

                result.value = [result.value];
                result.errors = this._checkItems.call(this, result.value, wasArray, state, options);

                if (result.errors) {

                    // Restore previous errors and value since this didn't validate either.
                    result.errors = previousErrors;
                    result.value = result.value[0];
                }
            }
        }

        return result;
    };

    _class.prototype._checkItems = function _checkItems(items, wasArray, state, options) {

        var errors = [];
        var errored = void 0;

        var requireds = this._inner.requireds.slice();
        var ordereds = this._inner.ordereds.slice();
        var inclusions = this._inner.inclusions.concat(requireds);

        var il = items.length;
        for (var i = 0; i < il; ++i) {
            errored = false;
            var item = items[i];
            var isValid = false;
            var key = wasArray ? i : state.key;
            var path = wasArray ? (state.path ? state.path + '.' : '') + i : state.path;
            var localState = { key: key, path: path, parent: state.parent, reference: state.reference };
            var res = void 0;

            // Sparse

            if (!this._flags.sparse && item === undefined) {
                errors.push(this.createError('array.sparse', null, { key: state.key, path: localState.path, pos: i }, options));

                if (options.abortEarly) {
                    return errors;
                }

                continue;
            }

            // Exclusions

            for (var j = 0; j < this._inner.exclusions.length; ++j) {
                res = this._inner.exclusions[j]._validate(item, localState, {}); // Not passing options to use defaults

                if (!res.errors) {
                    errors.push(this.createError(wasArray ? 'array.excludes' : 'array.excludesSingle', { pos: i, value: item }, { key: state.key, path: localState.path }, options));
                    errored = true;

                    if (options.abortEarly) {
                        return errors;
                    }

                    break;
                }
            }

            if (errored) {
                continue;
            }

            // Ordered
            if (this._inner.ordereds.length) {
                if (ordereds.length > 0) {
                    var ordered = ordereds.shift();
                    res = ordered._validate(item, localState, options);
                    if (!res.errors) {
                        if (ordered._flags.strip) {
                            internals.fastSplice(items, i);
                            --i;
                            --il;
                        } else if (!this._flags.sparse && res.value === undefined) {
                            errors.push(this.createError('array.sparse', null, { key: state.key, path: localState.path, pos: i }, options));

                            if (options.abortEarly) {
                                return errors;
                            }

                            continue;
                        } else {
                            items[i] = res.value;
                        }
                    } else {
                        errors.push(this.createError('array.ordered', { pos: i, reason: res.errors, value: item }, { key: state.key, path: localState.path }, options));
                        if (options.abortEarly) {
                            return errors;
                        }
                    }
                    continue;
                } else if (!this._inner.items.length) {
                    errors.push(this.createError('array.orderedLength', { pos: i, limit: this._inner.ordereds.length }, { key: state.key, path: localState.path }, options));
                    if (options.abortEarly) {
                        return errors;
                    }
                    continue;
                }
            }

            // Requireds

            var requiredChecks = [];
            var jl = requireds.length;
            for (var _j = 0; _j < jl; ++_j) {
                res = requiredChecks[_j] = requireds[_j]._validate(item, localState, options);
                if (!res.errors) {
                    items[i] = res.value;
                    isValid = true;
                    internals.fastSplice(requireds, _j);
                    --_j;
                    --jl;

                    if (!this._flags.sparse && res.value === undefined) {
                        errors.push(this.createError('array.sparse', null, { key: state.key, path: localState.path, pos: i }, options));

                        if (options.abortEarly) {
                            return errors;
                        }
                    }

                    break;
                }
            }

            if (isValid) {
                continue;
            }

            // Inclusions

            var stripUnknown = options.stripUnknown ? options.stripUnknown === true ? true : !!options.stripUnknown.arrays : false;

            jl = inclusions.length;
            for (var _j2 = 0; _j2 < jl; ++_j2) {
                var inclusion = inclusions[_j2];

                // Avoid re-running requireds that already didn't match in the previous loop
                var previousCheck = requireds.indexOf(inclusion);
                if (previousCheck !== -1) {
                    res = requiredChecks[previousCheck];
                } else {
                    res = inclusion._validate(item, localState, options);

                    if (!res.errors) {
                        if (inclusion._flags.strip) {
                            internals.fastSplice(items, i);
                            --i;
                            --il;
                        } else if (!this._flags.sparse && res.value === undefined) {
                            errors.push(this.createError('array.sparse', null, { key: state.key, path: localState.path, pos: i }, options));
                            errored = true;
                        } else {
                            items[i] = res.value;
                        }
                        isValid = true;
                        break;
                    }
                }

                // Return the actual error if only one inclusion defined
                if (jl === 1) {
                    if (stripUnknown) {
                        internals.fastSplice(items, i);
                        --i;
                        --il;
                        isValid = true;
                        break;
                    }

                    errors.push(this.createError(wasArray ? 'array.includesOne' : 'array.includesOneSingle', { pos: i, reason: res.errors, value: item }, { key: state.key, path: localState.path }, options));
                    errored = true;

                    if (options.abortEarly) {
                        return errors;
                    }

                    break;
                }
            }

            if (errored) {
                continue;
            }

            if (this._inner.inclusions.length && !isValid) {
                if (stripUnknown) {
                    internals.fastSplice(items, i);
                    --i;
                    --il;
                    continue;
                }

                errors.push(this.createError(wasArray ? 'array.includes' : 'array.includesSingle', { pos: i, value: item }, { key: state.key, path: localState.path }, options));

                if (options.abortEarly) {
                    return errors;
                }
            }
        }

        if (requireds.length) {
            this._fillMissedErrors.call(this, errors, requireds, state, options);
        }

        if (ordereds.length) {
            this._fillOrderedErrors.call(this, errors, ordereds, state, options);
        }

        return errors.length ? errors : null;
    };

    _class.prototype.describe = function describe() {

        var description = Any.prototype.describe.call(this);

        if (this._inner.ordereds.length) {
            description.orderedItems = [];

            for (var i = 0; i < this._inner.ordereds.length; ++i) {
                description.orderedItems.push(this._inner.ordereds[i].describe());
            }
        }

        if (this._inner.items.length) {
            description.items = [];

            for (var _i = 0; _i < this._inner.items.length; ++_i) {
                description.items.push(this._inner.items[_i].describe());
            }
        }

        return description;
    };

    _class.prototype.items = function items() {
        var _this2 = this;

        var obj = this.clone();

        Hoek.flatten(Array.prototype.slice.call(arguments)).forEach(function (type, index) {

            try {
                type = Cast.schema(_this2._currentJoi, type);
            } catch (castErr) {
                if (castErr.hasOwnProperty('path')) {
                    castErr.path = index + '.' + castErr.path;
                } else {
                    castErr.path = index;
                }
                castErr.message = castErr.message + '(' + castErr.path + ')';
                throw castErr;
            }

            obj._inner.items.push(type);

            if (type._flags.presence === 'required') {
                obj._inner.requireds.push(type);
            } else if (type._flags.presence === 'forbidden') {
                obj._inner.exclusions.push(type.optional());
            } else {
                obj._inner.inclusions.push(type);
            }
        });

        return obj;
    };

    _class.prototype.ordered = function ordered() {
        var _this3 = this;

        var obj = this.clone();

        Hoek.flatten(Array.prototype.slice.call(arguments)).forEach(function (type, index) {

            try {
                type = Cast.schema(_this3._currentJoi, type);
            } catch (castErr) {
                if (castErr.hasOwnProperty('path')) {
                    castErr.path = index + '.' + castErr.path;
                } else {
                    castErr.path = index;
                }
                castErr.message = castErr.message + '(' + castErr.path + ')';
                throw castErr;
            }
            obj._inner.ordereds.push(type);
        });

        return obj;
    };

    _class.prototype.min = function min(limit) {

        var isRef = Ref.isRef(limit);

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0 || isRef, 'limit must be a positive integer or reference');

        return this._test('min', limit, function (value, state, options) {

            var compareTo = void 0;
            if (isRef) {
                compareTo = limit(state.reference || state.parent, options);

                if (!(Number.isSafeInteger(compareTo) && compareTo >= 0)) {
                    return this.createError('array.ref', { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (value.length >= compareTo) {
                return value;
            }

            return this.createError('array.min', { limit: limit, value: value }, state, options);
        });
    };

    _class.prototype.max = function max(limit) {

        var isRef = Ref.isRef(limit);

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0 || isRef, 'limit must be a positive integer or reference');

        return this._test('max', limit, function (value, state, options) {

            var compareTo = void 0;
            if (isRef) {
                compareTo = limit(state.reference || state.parent, options);

                if (!(Number.isSafeInteger(compareTo) && compareTo >= 0)) {
                    return this.createError('array.ref', { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (value.length <= compareTo) {
                return value;
            }

            return this.createError('array.max', { limit: limit, value: value }, state, options);
        });
    };

    _class.prototype.length = function length(limit) {

        var isRef = Ref.isRef(limit);

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0 || isRef, 'limit must be a positive integer or reference');

        return this._test('length', limit, function (value, state, options) {

            var compareTo = void 0;
            if (isRef) {
                compareTo = limit(state.reference || state.parent, options);

                if (!(Number.isSafeInteger(compareTo) && compareTo >= 0)) {
                    return this.createError('array.ref', { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (value.length === compareTo) {
                return value;
            }

            return this.createError('array.length', { limit: limit, value: value }, state, options);
        });
    };

    _class.prototype.unique = function unique(comparator) {

        Hoek.assert(comparator === undefined || typeof comparator === 'function' || typeof comparator === 'string', 'comparator must be a function or a string');

        var settings = {};

        if (typeof comparator === 'string') {
            settings.path = comparator;
        } else if (typeof comparator === 'function') {
            settings.comparator = comparator;
        }

        return this._test('unique', settings, function (value, state, options) {

            var found = {
                string: {},
                number: {},
                undefined: {},
                boolean: {},
                object: new Map(),
                function: new Map(),
                custom: new Map()
            };

            var compare = settings.comparator || Hoek.deepEqual;

            for (var i = 0; i < value.length; ++i) {
                var item = settings.path ? Hoek.reach(value[i], settings.path) : value[i];
                var records = settings.comparator ? found.custom : found[typeof item === 'undefined' ? 'undefined' : _typeof(item)];

                // All available types are supported, so it's not possible to reach 100% coverage without ignoring this line.
                // I still want to keep the test for future js versions with new types (eg. Symbol).
                if ( /* $lab:coverage:off$ */records /* $lab:coverage:on$ */) {
                        if (records instanceof Map) {
                            var entries = records.entries();
                            var current = void 0;
                            while (!(current = entries.next()).done) {
                                if (compare(current.value[0], item)) {
                                    var localState = {
                                        key: state.key,
                                        path: (state.path ? state.path + '.' : '') + i,
                                        parent: state.parent,
                                        reference: state.reference
                                    };

                                    var context = {
                                        pos: i,
                                        value: value[i],
                                        dupePos: current.value[1],
                                        dupeValue: value[current.value[1]]
                                    };

                                    if (settings.path) {
                                        context.path = settings.path;
                                    }

                                    return this.createError('array.unique', context, localState, options);
                                }
                            }

                            records.set(item, i);
                        } else {
                            if (records[item] !== undefined) {
                                var _localState = {
                                    key: state.key,
                                    path: (state.path ? state.path + '.' : '') + i,
                                    parent: state.parent,
                                    reference: state.reference
                                };

                                var _context = {
                                    pos: i,
                                    value: value[i],
                                    dupePos: records[item],
                                    dupeValue: value[records[item]]
                                };

                                if (settings.path) {
                                    _context.path = settings.path;
                                }

                                return this.createError('array.unique', _context, _localState, options);
                            }

                            records[item] = i;
                        }
                    }
            }

            return value;
        });
    };

    _class.prototype.sparse = function sparse(enabled) {

        var value = enabled === undefined ? true : !!enabled;

        if (this._flags.sparse === value) {
            return this;
        }

        var obj = this.clone();
        obj._flags.sparse = value;
        return obj;
    };

    _class.prototype.single = function single(enabled) {

        var value = enabled === undefined ? true : !!enabled;

        if (this._flags.single === value) {
            return this;
        }

        var obj = this.clone();
        obj._flags.single = value;
        return obj;
    };

    _class.prototype._fillMissedErrors = function _fillMissedErrors(errors, requireds, state, options) {

        var knownMisses = [];
        var unknownMisses = 0;
        for (var i = 0; i < requireds.length; ++i) {
            var label = requireds[i]._getLabel();
            if (label) {
                knownMisses.push(label);
            } else {
                ++unknownMisses;
            }
        }

        if (knownMisses.length) {
            if (unknownMisses) {
                errors.push(this.createError('array.includesRequiredBoth', { knownMisses: knownMisses, unknownMisses: unknownMisses }, { key: state.key, path: state.path }, options));
            } else {
                errors.push(this.createError('array.includesRequiredKnowns', { knownMisses: knownMisses }, { key: state.key, path: state.path }, options));
            }
        } else {
            errors.push(this.createError('array.includesRequiredUnknowns', { unknownMisses: unknownMisses }, { key: state.key, path: state.path }, options));
        }
    };

    _class.prototype._fillOrderedErrors = function _fillOrderedErrors(errors, ordereds, state, options) {

        var requiredOrdereds = [];

        for (var i = 0; i < ordereds.length; ++i) {
            var presence = Hoek.reach(ordereds[i], '_flags.presence');
            if (presence === 'required') {
                requiredOrdereds.push(ordereds[i]);
            }
        }

        if (requiredOrdereds.length) {
            this._fillMissedErrors.call(this, errors, requiredOrdereds, state, options);
        }
    };

    return _class;
}(Any);

internals.safeParse = function (value, result) {

    try {
        var converted = JSON.parse(value);
        if (Array.isArray(converted)) {
            result.value = converted;
        }
    } catch (e) {}
};

module.exports = new internals.Array();
