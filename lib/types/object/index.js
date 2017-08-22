'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Hoek = require('hoek');
var Topo = require('topo');
var Any = require('../any');
var Errors = require('../../errors');
var Cast = require('../../cast');
var Ref = require('../../ref');

// Declare internals

var internals = {};

internals.Object = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'object';
        _this._inner.children = null;
        _this._inner.renames = [];
        _this._inner.dependencies = [];
        _this._inner.patterns = [];
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        var target = value;
        var errors = [];
        var finish = function finish() {

            return {
                value: target,
                errors: errors.length ? errors : null
            };
        };

        if (typeof value === 'string' && options.convert) {

            value = internals.safeParse(value);
        }

        var type = this._flags.func ? 'function' : 'object';
        if (!value || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== type || Array.isArray(value)) {

            errors.push(this.createError(type + '.base', null, state, options));
            return finish();
        }

        // Skip if there are no other rules to test

        if (!this._inner.renames.length && !this._inner.dependencies.length && !this._inner.children && // null allows any keys
        !this._inner.patterns.length) {

            target = value;
            return finish();
        }

        // Ensure target is a local copy (parsed) or shallow copy

        if (target === value) {
            if (type === 'object') {
                target = Object.create(Object.getPrototypeOf(value));
            } else {
                target = function target() {

                    return value.apply(this, arguments);
                };

                target.prototype = Hoek.clone(value.prototype);
            }

            var valueKeys = Object.keys(value);
            for (var i = 0; i < valueKeys.length; ++i) {
                target[valueKeys[i]] = value[valueKeys[i]];
            }
        } else {
            target = value;
        }

        // Rename keys

        var renamed = {};
        for (var _i = 0; _i < this._inner.renames.length; ++_i) {
            var rename = this._inner.renames[_i];

            if (rename.options.ignoreUndefined && target[rename.from] === undefined) {
                continue;
            }

            if (!rename.options.multiple && renamed[rename.to]) {

                errors.push(this.createError('object.rename.multiple', { from: rename.from, to: rename.to }, state, options));
                if (options.abortEarly) {
                    return finish();
                }
            }

            if (Object.prototype.hasOwnProperty.call(target, rename.to) && !rename.options.override && !renamed[rename.to]) {

                errors.push(this.createError('object.rename.override', { from: rename.from, to: rename.to }, state, options));
                if (options.abortEarly) {
                    return finish();
                }
            }

            if (target[rename.from] === undefined) {
                delete target[rename.to];
            } else {
                target[rename.to] = target[rename.from];
            }

            renamed[rename.to] = true;

            if (!rename.options.alias) {
                delete target[rename.from];
            }
        }

        // Validate schema

        if (!this._inner.children && // null allows any keys
        !this._inner.patterns.length && !this._inner.dependencies.length) {

            return finish();
        }

        var unprocessed = Hoek.mapToObject(Object.keys(target));

        if (this._inner.children) {
            var stripProps = [];

            for (var _i2 = 0; _i2 < this._inner.children.length; ++_i2) {
                var child = this._inner.children[_i2];
                var key = child.key;
                var item = target[key];

                delete unprocessed[key];

                var localState = { key: key, path: (state.path || '') + (state.path && key ? '.' : '') + key, parent: target, reference: state.reference };
                var result = child.schema._validate(item, localState, options);
                if (result.errors) {
                    errors.push(this.createError('object.child', { key: key, child: child.schema._getLabel(key), reason: result.errors }, localState, options));

                    if (options.abortEarly) {
                        return finish();
                    }
                } else {
                    if (child.schema._flags.strip || result.value === undefined && result.value !== item) {
                        stripProps.push(key);
                        target[key] = result.finalValue;
                    } else if (result.value !== undefined) {
                        target[key] = result.value;
                    }
                }
            }

            for (var _i3 = 0; _i3 < stripProps.length; ++_i3) {
                delete target[stripProps[_i3]];
            }
        }

        // Unknown keys

        var unprocessedKeys = Object.keys(unprocessed);
        if (unprocessedKeys.length && this._inner.patterns.length) {

            for (var _i4 = 0; _i4 < unprocessedKeys.length; ++_i4) {
                var _key = unprocessedKeys[_i4];
                var _localState = { key: _key, path: (state.path ? state.path + '.' : '') + _key, parent: target, reference: state.reference };
                var _item = target[_key];

                for (var j = 0; j < this._inner.patterns.length; ++j) {
                    var pattern = this._inner.patterns[j];

                    if (pattern.regex.test(_key)) {
                        delete unprocessed[_key];

                        var _result = pattern.rule._validate(_item, _localState, options);
                        if (_result.errors) {
                            errors.push(this.createError('object.child', { key: _key, child: pattern.rule._getLabel(_key), reason: _result.errors }, _localState, options));

                            if (options.abortEarly) {
                                return finish();
                            }
                        }

                        if (_result.value !== undefined) {
                            target[_key] = _result.value;
                        }
                    }
                }
            }

            unprocessedKeys = Object.keys(unprocessed);
        }

        if ((this._inner.children || this._inner.patterns.length) && unprocessedKeys.length) {
            if (options.stripUnknown && this._flags.allowUnknown !== true || options.skipFunctions) {

                var stripUnknown = options.stripUnknown ? options.stripUnknown === true ? true : !!options.stripUnknown.objects : false;

                for (var _i5 = 0; _i5 < unprocessedKeys.length; ++_i5) {
                    var _key2 = unprocessedKeys[_i5];

                    if (stripUnknown) {
                        delete target[_key2];
                        delete unprocessed[_key2];
                    } else if (typeof target[_key2] === 'function') {
                        delete unprocessed[_key2];
                    }
                }

                unprocessedKeys = Object.keys(unprocessed);
            }

            if (unprocessedKeys.length && (this._flags.allowUnknown !== undefined ? !this._flags.allowUnknown : !options.allowUnknown)) {

                for (var _i6 = 0; _i6 < unprocessedKeys.length; ++_i6) {
                    var unprocessedKey = unprocessedKeys[_i6];
                    errors.push(this.createError('object.allowUnknown', { child: unprocessedKey }, { key: unprocessedKey, path: state.path + (state.path ? '.' : '') + unprocessedKey }, options));
                }
            }
        }

        // Validate dependencies

        for (var _i7 = 0; _i7 < this._inner.dependencies.length; ++_i7) {
            var dep = this._inner.dependencies[_i7];
            var err = internals[dep.type].call(this, dep.key !== null && target[dep.key], dep.peers, target, { key: dep.key, path: (state.path || '') + (dep.key ? '.' + dep.key : '') }, options);
            if (err instanceof Errors.Err) {
                errors.push(err);
                if (options.abortEarly) {
                    return finish();
                }
            }
        }

        return finish();
    };

    _class.prototype._func = function _func() {

        var obj = this.clone();
        obj._flags.func = true;
        return obj;
    };

    _class.prototype.keys = function keys(schema) {

        Hoek.assert(schema === null || schema === undefined || (typeof schema === 'undefined' ? 'undefined' : _typeof(schema)) === 'object', 'Object schema must be a valid object');
        Hoek.assert(!schema || !(schema instanceof Any), 'Object schema cannot be a joi schema');

        var obj = this.clone();

        if (!schema) {
            obj._inner.children = null;
            return obj;
        }

        var children = Object.keys(schema);

        if (!children.length) {
            obj._inner.children = [];
            return obj;
        }

        var topo = new Topo();
        if (obj._inner.children) {
            for (var i = 0; i < obj._inner.children.length; ++i) {
                var child = obj._inner.children[i];

                // Only add the key if we are not going to replace it later
                if (children.indexOf(child.key) === -1) {
                    topo.add(child, { after: child._refs, group: child.key });
                }
            }
        }

        for (var _i8 = 0; _i8 < children.length; ++_i8) {
            var key = children[_i8];
            var _child = schema[key];
            try {
                var cast = Cast.schema(this._currentJoi, _child);
                topo.add({ key: key, schema: cast }, { after: cast._refs, group: key });
            } catch (castErr) {
                if (castErr.hasOwnProperty('path')) {
                    castErr.path = key + '.' + castErr.path;
                } else {
                    castErr.path = key;
                }
                throw castErr;
            }
        }

        obj._inner.children = topo.nodes;

        return obj;
    };

    _class.prototype.unknown = function unknown(allow) {

        var value = allow !== false;

        if (this._flags.allowUnknown === value) {
            return this;
        }

        var obj = this.clone();
        obj._flags.allowUnknown = value;
        return obj;
    };

    _class.prototype.length = function length(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('length', limit, function (value, state, options) {

            if (Object.keys(value).length === limit) {
                return value;
            }

            return this.createError('object.length', { limit: limit }, state, options);
        });
    };

    _class.prototype.arity = function arity(n) {

        Hoek.assert(Number.isSafeInteger(n) && n >= 0, 'n must be a positive integer');

        return this._test('arity', n, function (value, state, options) {

            if (value.length === n) {
                return value;
            }

            return this.createError('function.arity', { n: n }, state, options);
        });
    };

    _class.prototype.minArity = function minArity(n) {

        Hoek.assert(Number.isSafeInteger(n) && n > 0, 'n must be a strict positive integer');

        return this._test('minArity', n, function (value, state, options) {

            if (value.length >= n) {
                return value;
            }

            return this.createError('function.minArity', { n: n }, state, options);
        });
    };

    _class.prototype.maxArity = function maxArity(n) {

        Hoek.assert(Number.isSafeInteger(n) && n >= 0, 'n must be a positive integer');

        return this._test('maxArity', n, function (value, state, options) {

            if (value.length <= n) {
                return value;
            }

            return this.createError('function.maxArity', { n: n }, state, options);
        });
    };

    _class.prototype.min = function min(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('min', limit, function (value, state, options) {

            if (Object.keys(value).length >= limit) {
                return value;
            }

            return this.createError('object.min', { limit: limit }, state, options);
        });
    };

    _class.prototype.max = function max(limit) {

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0, 'limit must be a positive integer');

        return this._test('max', limit, function (value, state, options) {

            if (Object.keys(value).length <= limit) {
                return value;
            }

            return this.createError('object.max', { limit: limit }, state, options);
        });
    };

    _class.prototype.pattern = function pattern(_pattern, schema) {

        Hoek.assert(_pattern instanceof RegExp, 'Invalid regular expression');
        Hoek.assert(schema !== undefined, 'Invalid rule');

        _pattern = new RegExp(_pattern.source, _pattern.ignoreCase ? 'i' : undefined); // Future version should break this and forbid unsupported regex flags

        try {
            schema = Cast.schema(this._currentJoi, schema);
        } catch (castErr) {
            if (castErr.hasOwnProperty('path')) {
                castErr.message = castErr.message + '(' + castErr.path + ')';
            }

            throw castErr;
        }

        var obj = this.clone();
        obj._inner.patterns.push({ regex: _pattern, rule: schema });
        return obj;
    };

    _class.prototype.schema = function schema() {

        return this._test('schema', null, function (value, state, options) {

            if (value instanceof Any) {
                return value;
            }

            return this.createError('object.schema', null, state, options);
        });
    };

    _class.prototype.with = function _with(key, peers) {

        return this._dependency('with', key, peers);
    };

    _class.prototype.without = function without(key, peers) {

        return this._dependency('without', key, peers);
    };

    _class.prototype.xor = function xor() {

        var peers = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this._dependency('xor', null, peers);
    };

    _class.prototype.or = function or() {

        var peers = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this._dependency('or', null, peers);
    };

    _class.prototype.and = function and() {

        var peers = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this._dependency('and', null, peers);
    };

    _class.prototype.nand = function nand() {

        var peers = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this._dependency('nand', null, peers);
    };

    _class.prototype.requiredKeys = function requiredKeys(children) {

        children = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this.applyFunctionToChildren(children, 'required');
    };

    _class.prototype.optionalKeys = function optionalKeys(children) {

        children = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this.applyFunctionToChildren(children, 'optional');
    };

    _class.prototype.forbiddenKeys = function forbiddenKeys(children) {

        children = Hoek.flatten(Array.prototype.slice.call(arguments));
        return this.applyFunctionToChildren(children, 'forbidden');
    };

    _class.prototype.rename = function rename(from, to, options) {

        Hoek.assert(typeof from === 'string', 'Rename missing the from argument');
        Hoek.assert(typeof to === 'string', 'Rename missing the to argument');
        Hoek.assert(to !== from, 'Cannot rename key to same name:', from);

        for (var i = 0; i < this._inner.renames.length; ++i) {
            Hoek.assert(this._inner.renames[i].from !== from, 'Cannot rename the same key multiple times');
        }

        var obj = this.clone();

        obj._inner.renames.push({
            from: from,
            to: to,
            options: Hoek.applyToDefaults(internals.renameDefaults, options || {})
        });

        return obj;
    };

    _class.prototype.applyFunctionToChildren = function applyFunctionToChildren(children, fn, args, root) {

        children = [].concat(children);
        Hoek.assert(children.length > 0, 'expected at least one children');

        var groupedChildren = internals.groupChildren(children);
        var obj = void 0;

        if ('' in groupedChildren) {
            obj = this[fn].apply(this, args);
            delete groupedChildren[''];
        } else {
            obj = this.clone();
        }

        if (obj._inner.children) {
            root = root ? root + '.' : '';

            for (var i = 0; i < obj._inner.children.length; ++i) {
                var child = obj._inner.children[i];
                var group = groupedChildren[child.key];

                if (group) {
                    obj._inner.children[i] = {
                        key: child.key,
                        _refs: child._refs,
                        schema: child.schema.applyFunctionToChildren(group, fn, args, root + child.key)
                    };

                    delete groupedChildren[child.key];
                }
            }
        }

        var remaining = Object.keys(groupedChildren);
        Hoek.assert(remaining.length === 0, 'unknown key(s)', remaining.join(', '));

        return obj;
    };

    _class.prototype._dependency = function _dependency(type, key, peers) {

        peers = [].concat(peers);
        for (var i = 0; i < peers.length; ++i) {
            Hoek.assert(typeof peers[i] === 'string', type, 'peers must be a string or array of strings');
        }

        var obj = this.clone();
        obj._inner.dependencies.push({ type: type, key: key, peers: peers });
        return obj;
    };

    _class.prototype.describe = function describe(shallow) {

        var description = Any.prototype.describe.call(this);

        if (description.rules) {
            for (var i = 0; i < description.rules.length; ++i) {
                var rule = description.rules[i];
                // Coverage off for future-proof descriptions, only object().assert() is use right now
                if ( /* $lab:coverage:off$ */rule.arg && _typeof(rule.arg) === 'object' && rule.arg.schema && rule.arg.ref /* $lab:coverage:on$ */) {
                        rule.arg = {
                            schema: rule.arg.schema.describe(),
                            ref: rule.arg.ref.toString()
                        };
                    }
            }
        }

        if (this._inner.children && !shallow) {

            description.children = {};
            for (var _i9 = 0; _i9 < this._inner.children.length; ++_i9) {
                var child = this._inner.children[_i9];
                description.children[child.key] = child.schema.describe();
            }
        }

        if (this._inner.dependencies.length) {
            description.dependencies = Hoek.clone(this._inner.dependencies);
        }

        if (this._inner.patterns.length) {
            description.patterns = [];

            for (var _i10 = 0; _i10 < this._inner.patterns.length; ++_i10) {
                var pattern = this._inner.patterns[_i10];
                description.patterns.push({ regex: pattern.regex.toString(), rule: pattern.rule.describe() });
            }
        }

        if (this._inner.renames.length > 0) {
            description.renames = Hoek.clone(this._inner.renames);
        }

        return description;
    };

    _class.prototype.assert = function assert(ref, schema, message) {

        ref = Cast.ref(ref);
        Hoek.assert(ref.isContext || ref.depth > 1, 'Cannot use assertions for root level references - use direct key rules instead');
        message = message || 'pass the assertion test';

        try {
            schema = Cast.schema(this._currentJoi, schema);
        } catch (castErr) {
            if (castErr.hasOwnProperty('path')) {
                castErr.message = castErr.message + '(' + castErr.path + ')';
            }

            throw castErr;
        }

        var key = ref.path[ref.path.length - 1];
        var path = ref.path.join('.');

        return this._test('assert', { schema: schema, ref: ref }, function (value, state, options) {

            var result = schema._validate(ref(value), null, options, value);
            if (!result.errors) {
                return value;
            }

            var localState = Hoek.merge({}, state);
            localState.key = key;
            localState.path = path;
            return this.createError('object.assert', { ref: localState.path, message: message }, localState, options);
        });
    };

    _class.prototype.type = function type(constructor, name) {

        Hoek.assert(typeof constructor === 'function', 'type must be a constructor function');
        var typeData = {
            name: name || constructor.name,
            ctor: constructor
        };

        return this._test('type', typeData, function (value, state, options) {

            if (value instanceof constructor) {
                return value;
            }

            return this.createError('object.type', { type: typeData.name }, state, options);
        });
    };

    _class.prototype.ref = function ref() {

        return this._test('ref', null, function (value, state, options) {

            if (Ref.isRef(value)) {
                return value;
            }

            return this.createError('function.ref', null, state, options);
        });
    };

    return _class;
}(Any);

internals.safeParse = function (value) {

    try {
        return JSON.parse(value);
    } catch (parseErr) {}

    return value;
};

internals.renameDefaults = {
    alias: false, // Keep old value in place
    multiple: false, // Allow renaming multiple keys into the same target
    override: false // Overrides an existing key
};

internals.groupChildren = function (children) {

    children.sort();

    var grouped = {};

    for (var i = 0; i < children.length; ++i) {
        var child = children[i];
        Hoek.assert(typeof child === 'string', 'children must be strings');
        var group = child.split('.')[0];
        var childGroup = grouped[group] = grouped[group] || [];
        childGroup.push(child.substring(group.length + 1));
    }

    return grouped;
};

internals.keysToLabels = function (schema, keys) {

    var children = schema._inner.children;

    if (!children) {
        return keys;
    }

    var findLabel = function findLabel(key) {

        var matchingChild = children.find(function (child) {
            return child.key === key;
        });
        return matchingChild ? matchingChild.schema._getLabel(key) : key;
    };

    if (Array.isArray(keys)) {
        return keys.map(findLabel);
    }

    return findLabel(keys);
};

internals.with = function (value, peers, parent, state, options) {

    if (value === undefined) {
        return value;
    }

    for (var i = 0; i < peers.length; ++i) {
        var peer = peers[i];
        if (!Object.prototype.hasOwnProperty.call(parent, peer) || parent[peer] === undefined) {

            return this.createError('object.with', {
                main: state.key,
                mainWithLabel: internals.keysToLabels(this, state.key),
                peer: peer,
                peerWithLabel: internals.keysToLabels(this, peer)
            }, state, options);
        }
    }

    return value;
};

internals.without = function (value, peers, parent, state, options) {

    if (value === undefined) {
        return value;
    }

    for (var i = 0; i < peers.length; ++i) {
        var peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) && parent[peer] !== undefined) {

            return this.createError('object.without', {
                main: state.key,
                mainWithLabel: internals.keysToLabels(this, state.key),
                peer: peer,
                peerWithLabel: internals.keysToLabels(this, peer)
            }, state, options);
        }
    }

    return value;
};

internals.xor = function (value, peers, parent, state, options) {

    var present = [];
    for (var i = 0; i < peers.length; ++i) {
        var peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) && parent[peer] !== undefined) {

            present.push(peer);
        }
    }

    if (present.length === 1) {
        return value;
    }

    var context = { peers: peers, peersWithLabels: internals.keysToLabels(this, peers) };

    if (present.length === 0) {
        return this.createError('object.missing', context, state, options);
    }

    return this.createError('object.xor', context, state, options);
};

internals.or = function (value, peers, parent, state, options) {

    for (var i = 0; i < peers.length; ++i) {
        var peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) && parent[peer] !== undefined) {
            return value;
        }
    }

    return this.createError('object.missing', {
        peers: peers,
        peersWithLabels: internals.keysToLabels(this, peers)
    }, state, options);
};

internals.and = function (value, peers, parent, state, options) {

    var missing = [];
    var present = [];
    var count = peers.length;
    for (var i = 0; i < count; ++i) {
        var peer = peers[i];
        if (!Object.prototype.hasOwnProperty.call(parent, peer) || parent[peer] === undefined) {

            missing.push(peer);
        } else {
            present.push(peer);
        }
    }

    var aon = missing.length === count || present.length === count;

    if (!aon) {

        return this.createError('object.and', {
            present: present,
            presentWithLabels: internals.keysToLabels(this, present),
            missing: missing,
            missingWithLabels: internals.keysToLabels(this, missing)
        }, state, options);
    }
};

internals.nand = function (value, peers, parent, state, options) {

    var present = [];
    for (var i = 0; i < peers.length; ++i) {
        var peer = peers[i];
        if (Object.prototype.hasOwnProperty.call(parent, peer) && parent[peer] !== undefined) {

            present.push(peer);
        }
    }

    var values = Hoek.clone(peers);
    var main = values.splice(0, 1)[0];
    var allPresent = present.length === peers.length;
    return allPresent ? this.createError('object.nand', {
        main: main,
        mainWithLabel: internals.keysToLabels(this, main),
        peers: values,
        peersWithLabels: internals.keysToLabels(this, values)
    }, state, options) : null;
};

module.exports = new internals.Object();
