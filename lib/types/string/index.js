'use strict';

// Load modules

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Net = require('net');
var Hoek = require('hoek');
var Isemail = void 0; // Loaded on demand
var Any = require('../any');
var Ref = require('../../ref');
var JoiDate = require('../date');
var Uri = require('./uri');
var Ip = require('./ip');

// Declare internals

var internals = {
    uriRegex: Uri.createUriRegex(),
    ipRegex: Ip.createIpRegex(['ipv4', 'ipv6', 'ipvfuture'], 'optional'),
    guidBrackets: {
        '{': '}', '[': ']', '(': ')', '': ''
    },
    guidVersions: {
        uuidv1: '1',
        uuidv2: '2',
        uuidv3: '3',
        uuidv4: '4',
        uuidv5: '5'
    },
    cidrPresences: ['required', 'optional', 'forbidden']
};

internals.String = function (_Any) {
    _inherits(_class, _Any);

    function _class() {
        _classCallCheck(this, _class);

        var _this = _possibleConstructorReturn(this, _Any.call(this));

        _this._type = 'string';
        _this._invalids.add('');
        return _this;
    }

    _class.prototype._base = function _base(value, state, options) {

        if (typeof value === 'string' && options.convert) {

            if (this._flags.case) {
                value = this._flags.case === 'upper' ? value.toLocaleUpperCase() : value.toLocaleLowerCase();
            }

            if (this._flags.trim) {
                value = value.trim();
            }

            if (this._inner.replacements) {

                for (var i = 0; i < this._inner.replacements.length; ++i) {
                    var replacement = this._inner.replacements[i];
                    value = value.replace(replacement.pattern, replacement.replacement);
                }
            }

            if (this._flags.truncate) {
                for (var _i = 0; _i < this._tests.length; ++_i) {
                    var test = this._tests[_i];
                    if (test.name === 'max') {
                        value = value.slice(0, test.arg);
                        break;
                    }
                }
            }
        }

        return {
            value: value,
            errors: typeof value === 'string' ? null : this.createError('string.base', { value: value }, state, options)
        };
    };

    _class.prototype.insensitive = function insensitive() {

        if (this._flags.insensitive) {
            return this;
        }

        var obj = this.clone();
        obj._flags.insensitive = true;
        return obj;
    };

    _class.prototype.creditCard = function creditCard() {

        return this._test('creditCard', undefined, function (value, state, options) {

            var i = value.length;
            var sum = 0;
            var mul = 1;

            while (i--) {
                var char = value.charAt(i) * mul;
                sum = sum + (char - (char > 9) * 9);
                mul = mul ^ 3;
            }

            var check = sum % 10 === 0 && sum > 0;
            return check ? value : this.createError('string.creditCard', { value: value }, state, options);
        });
    };

    _class.prototype.regex = function regex(pattern, patternOptions) {

        Hoek.assert(pattern instanceof RegExp, 'pattern must be a RegExp');

        var patternObject = {
            pattern: new RegExp(pattern.source, pattern.ignoreCase ? 'i' : undefined) // Future version should break this and forbid unsupported regex flags
        };

        if (typeof patternOptions === 'string') {
            patternObject.name = patternOptions;
        } else if ((typeof patternOptions === 'undefined' ? 'undefined' : _typeof(patternOptions)) === 'object') {
            patternObject.invert = !!patternOptions.invert;

            if (patternOptions.name) {
                patternObject.name = patternOptions.name;
            }
        }

        var errorCode = ['string.regex', patternObject.invert ? '.invert' : '', patternObject.name ? '.name' : '.base'].join('');

        return this._test('regex', patternObject, function (value, state, options) {

            var patternMatch = patternObject.pattern.test(value);

            if (patternMatch ^ patternObject.invert) {
                return value;
            }

            return this.createError(errorCode, { name: patternObject.name, pattern: patternObject.pattern, value: value }, state, options);
        });
    };

    _class.prototype.alphanum = function alphanum() {

        return this._test('alphanum', undefined, function (value, state, options) {

            if (/^[a-zA-Z0-9]+$/.test(value)) {
                return value;
            }

            return this.createError('string.alphanum', { value: value }, state, options);
        });
    };

    _class.prototype.token = function token() {

        return this._test('token', undefined, function (value, state, options) {

            if (/^\w+$/.test(value)) {
                return value;
            }

            return this.createError('string.token', { value: value }, state, options);
        });
    };

    _class.prototype.email = function email(isEmailOptions) {

        if (isEmailOptions) {
            Hoek.assert((typeof isEmailOptions === 'undefined' ? 'undefined' : _typeof(isEmailOptions)) === 'object', 'email options must be an object');
            Hoek.assert(typeof isEmailOptions.checkDNS === 'undefined', 'checkDNS option is not supported');
            Hoek.assert(typeof isEmailOptions.tldWhitelist === 'undefined' || _typeof(isEmailOptions.tldWhitelist) === 'object', 'tldWhitelist must be an array or object');
            Hoek.assert(typeof isEmailOptions.minDomainAtoms === 'undefined' || Number.isSafeInteger(isEmailOptions.minDomainAtoms) && isEmailOptions.minDomainAtoms > 0, 'minDomainAtoms must be a positive integer');
            Hoek.assert(typeof isEmailOptions.errorLevel === 'undefined' || typeof isEmailOptions.errorLevel === 'boolean' || Number.isSafeInteger(isEmailOptions.errorLevel) && isEmailOptions.errorLevel >= 0, 'errorLevel must be a non-negative integer or boolean');
        }

        return this._test('email', isEmailOptions, function (value, state, options) {

            Isemail = Isemail || require('isemail');

            try {
                var result = Isemail.validate(value, isEmailOptions);
                if (result === true || result === 0) {
                    return value;
                }
            } catch (e) {}

            return this.createError('string.email', { value: value }, state, options);
        });
    };

    _class.prototype.ip = function ip(ipOptions) {

        var regex = internals.ipRegex;
        ipOptions = ipOptions || {};
        Hoek.assert((typeof ipOptions === 'undefined' ? 'undefined' : _typeof(ipOptions)) === 'object', 'options must be an object');

        if (ipOptions.cidr) {
            Hoek.assert(typeof ipOptions.cidr === 'string', 'cidr must be a string');
            ipOptions.cidr = ipOptions.cidr.toLowerCase();

            Hoek.assert(Hoek.contain(internals.cidrPresences, ipOptions.cidr), 'cidr must be one of ' + internals.cidrPresences.join(', '));

            // If we only received a `cidr` setting, create a regex for it. But we don't need to create one if `cidr` is "optional" since that is the default
            if (!ipOptions.version && ipOptions.cidr !== 'optional') {
                regex = Ip.createIpRegex(['ipv4', 'ipv6', 'ipvfuture'], ipOptions.cidr);
            }
        } else {

            // Set our default cidr strategy
            ipOptions.cidr = 'optional';
        }

        var versions = void 0;
        if (ipOptions.version) {
            if (!Array.isArray(ipOptions.version)) {
                ipOptions.version = [ipOptions.version];
            }

            Hoek.assert(ipOptions.version.length >= 1, 'version must have at least 1 version specified');

            versions = [];
            for (var i = 0; i < ipOptions.version.length; ++i) {
                var version = ipOptions.version[i];
                Hoek.assert(typeof version === 'string', 'version at position ' + i + ' must be a string');
                version = version.toLowerCase();
                Hoek.assert(Ip.versions[version], 'version at position ' + i + ' must be one of ' + Object.keys(Ip.versions).join(', '));
                versions.push(version);
            }

            // Make sure we have a set of versions
            versions = Hoek.unique(versions);

            regex = Ip.createIpRegex(versions, ipOptions.cidr);
        }

        return this._test('ip', ipOptions, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            if (versions) {
                return this.createError('string.ipVersion', { value: value, cidr: ipOptions.cidr, version: versions }, state, options);
            }

            return this.createError('string.ip', { value: value, cidr: ipOptions.cidr }, state, options);
        });
    };

    _class.prototype.uri = function uri(uriOptions) {

        var customScheme = '';
        var allowRelative = false;
        var relativeOnly = false;
        var regex = internals.uriRegex;

        if (uriOptions) {
            Hoek.assert((typeof uriOptions === 'undefined' ? 'undefined' : _typeof(uriOptions)) === 'object', 'options must be an object');

            if (uriOptions.scheme) {
                Hoek.assert(uriOptions.scheme instanceof RegExp || typeof uriOptions.scheme === 'string' || Array.isArray(uriOptions.scheme), 'scheme must be a RegExp, String, or Array');

                if (!Array.isArray(uriOptions.scheme)) {
                    uriOptions.scheme = [uriOptions.scheme];
                }

                Hoek.assert(uriOptions.scheme.length >= 1, 'scheme must have at least 1 scheme specified');

                // Flatten the array into a string to be used to match the schemes.
                for (var i = 0; i < uriOptions.scheme.length; ++i) {
                    var scheme = uriOptions.scheme[i];
                    Hoek.assert(scheme instanceof RegExp || typeof scheme === 'string', 'scheme at position ' + i + ' must be a RegExp or String');

                    // Add OR separators if a value already exists
                    customScheme = customScheme + (customScheme ? '|' : '');

                    // If someone wants to match HTTP or HTTPS for example then we need to support both RegExp and String so we don't escape their pattern unknowingly.
                    if (scheme instanceof RegExp) {
                        customScheme = customScheme + scheme.source;
                    } else {
                        Hoek.assert(/[a-zA-Z][a-zA-Z0-9+-\.]*/.test(scheme), 'scheme at position ' + i + ' must be a valid scheme');
                        customScheme = customScheme + Hoek.escapeRegex(scheme);
                    }
                }
            }

            if (uriOptions.allowRelative) {
                allowRelative = true;
            }

            if (uriOptions.relativeOnly) {
                relativeOnly = true;
            }
        }

        if (customScheme || allowRelative || relativeOnly) {
            regex = Uri.createUriRegex(customScheme, allowRelative, relativeOnly);
        }

        return this._test('uri', uriOptions, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            if (relativeOnly) {
                return this.createError('string.uriRelativeOnly', { value: value }, state, options);
            }

            if (customScheme) {
                return this.createError('string.uriCustomScheme', { scheme: customScheme, value: value }, state, options);
            }

            return this.createError('string.uri', { value: value }, state, options);
        });
    };

    _class.prototype.isoDate = function isoDate() {

        return this._test('isoDate', undefined, function (value, state, options) {

            if (JoiDate._isIsoDate(value)) {
                if (!options.convert) {
                    return value;
                }

                var d = new Date(value);
                if (!isNaN(d.getTime())) {
                    return d.toISOString();
                }
            }

            return this.createError('string.isoDate', { value: value }, state, options);
        });
    };

    _class.prototype.guid = function guid(guidOptions) {

        var versionNumbers = '';

        if (guidOptions && guidOptions.version) {
            if (!Array.isArray(guidOptions.version)) {
                guidOptions.version = [guidOptions.version];
            }

            Hoek.assert(guidOptions.version.length >= 1, 'version must have at least 1 valid version specified');
            var versions = new Set();

            for (var i = 0; i < guidOptions.version.length; ++i) {
                var version = guidOptions.version[i];
                Hoek.assert(typeof version === 'string', 'version at position ' + i + ' must be a string');
                version = version.toLowerCase();
                var versionNumber = internals.guidVersions[version];
                Hoek.assert(versionNumber, 'version at position ' + i + ' must be one of ' + Object.keys(internals.guidVersions).join(', '));
                Hoek.assert(!versions.has(versionNumber), 'version at position ' + i + ' must not be a duplicate.');

                versionNumbers += versionNumber;
                versions.add(versionNumber);
            }
        }

        var guidRegex = new RegExp('^([\\[{\\(]?)[0-9A-F]{8}([:-]?)[0-9A-F]{4}\\2?[' + (versionNumbers || '0-9A-F') + '][0-9A-F]{3}\\2?[' + (versionNumbers ? '89AB' : '0-9A-F') + '][0-9A-F]{3}\\2?[0-9A-F]{12}([\\]}\\)]?)$', 'i');

        return this._test('guid', guidOptions, function (value, state, options) {

            var results = guidRegex.exec(value);

            if (!results) {
                return this.createError('string.guid', { value: value }, state, options);
            }

            // Matching braces
            if (internals.guidBrackets[results[1]] !== results[results.length - 1]) {
                return this.createError('string.guid', { value: value }, state, options);
            }

            return value;
        });
    };

    _class.prototype.hex = function hex() {

        var regex = /^[a-f0-9]+$/i;

        return this._test('hex', regex, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            return this.createError('string.hex', { value: value }, state, options);
        });
    };

    _class.prototype.base64 = function base64(base64Options) {

        base64Options = base64Options || {};

        // Validation.
        Hoek.assert((typeof base64Options === 'undefined' ? 'undefined' : _typeof(base64Options)) === 'object', 'base64 options must be an object');
        Hoek.assert(typeof base64Options.paddingRequired === 'undefined' || typeof base64Options.paddingRequired === 'boolean', 'paddingRequired must be boolean');

        // Determine if padding is required.
        var paddingRequired = base64Options.paddingRequired === false ? base64Options.paddingRequired : base64Options.paddingRequired || true;

        // Set validation based on preference.
        var regex = paddingRequired ?
        // Padding is required.
        /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/
        // Padding is optional.
        : /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}(==)?|[A-Za-z0-9+\/]{3}=?)?$/;

        return this._test('base64', regex, function (value, state, options) {

            if (regex.test(value)) {
                return value;
            }

            return this.createError('string.base64', { value: value }, state, options);
        });
    };

    _class.prototype.hostname = function hostname() {

        var regex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

        return this._test('hostname', undefined, function (value, state, options) {

            if (value.length <= 255 && regex.test(value) || Net.isIPv6(value)) {

                return value;
            }

            return this.createError('string.hostname', { value: value }, state, options);
        });
    };

    _class.prototype.lowercase = function lowercase() {

        var obj = this._test('lowercase', undefined, function (value, state, options) {

            if (options.convert || value === value.toLocaleLowerCase()) {

                return value;
            }

            return this.createError('string.lowercase', { value: value }, state, options);
        });

        obj._flags.case = 'lower';
        return obj;
    };

    _class.prototype.uppercase = function uppercase() {

        var obj = this._test('uppercase', undefined, function (value, state, options) {

            if (options.convert || value === value.toLocaleUpperCase()) {

                return value;
            }

            return this.createError('string.uppercase', { value: value }, state, options);
        });

        obj._flags.case = 'upper';
        return obj;
    };

    _class.prototype.trim = function trim() {

        var obj = this._test('trim', undefined, function (value, state, options) {

            if (options.convert || value === value.trim()) {

                return value;
            }

            return this.createError('string.trim', { value: value }, state, options);
        });

        obj._flags.trim = true;
        return obj;
    };

    _class.prototype.replace = function replace(pattern, replacement) {

        if (typeof pattern === 'string') {
            pattern = new RegExp(Hoek.escapeRegex(pattern), 'g');
        }

        Hoek.assert(pattern instanceof RegExp, 'pattern must be a RegExp');
        Hoek.assert(typeof replacement === 'string', 'replacement must be a String');

        // This can not be considere a test like trim, we can't "reject"
        // anything from this rule, so just clone the current object
        var obj = this.clone();

        if (!obj._inner.replacements) {
            obj._inner.replacements = [];
        }

        obj._inner.replacements.push({
            pattern: pattern,
            replacement: replacement
        });

        return obj;
    };

    _class.prototype.truncate = function truncate(enabled) {

        var value = enabled === undefined ? true : !!enabled;

        if (this._flags.truncate === value) {
            return this;
        }

        var obj = this.clone();
        obj._flags.truncate = value;
        return obj;
    };

    return _class;
}(Any);

internals.compare = function (type, compare) {

    return function (limit, encoding) {

        var isRef = Ref.isRef(limit);

        Hoek.assert(Number.isSafeInteger(limit) && limit >= 0 || isRef, 'limit must be a positive integer or reference');
        Hoek.assert(!encoding || Buffer.isEncoding(encoding), 'Invalid encoding:', encoding);

        return this._test(type, limit, function (value, state, options) {

            var compareTo = void 0;
            if (isRef) {
                compareTo = limit(state.reference || state.parent, options);

                if (!Number.isSafeInteger(compareTo)) {
                    return this.createError('string.ref', { ref: limit.key }, state, options);
                }
            } else {
                compareTo = limit;
            }

            if (compare(value, compareTo, encoding)) {
                return value;
            }

            return this.createError('string.' + type, { limit: compareTo, value: value, encoding: encoding }, state, options);
        });
    };
};

internals.String.prototype.min = internals.compare('min', function (value, limit, encoding) {

    var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length >= limit;
});

internals.String.prototype.max = internals.compare('max', function (value, limit, encoding) {

    var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length <= limit;
});

internals.String.prototype.length = internals.compare('length', function (value, limit, encoding) {

    var length = encoding ? Buffer.byteLength(value, encoding) : value.length;
    return length === limit;
});

// Aliases

internals.String.prototype.uuid = internals.String.prototype.guid;

module.exports = new internals.String();
