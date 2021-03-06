'use strict';

// Load Modules

var RFC3986 = require('./rfc3986');

// Declare internals

var internals = {
    Uri: {
        createUriRegex: function createUriRegex(optionalScheme, allowRelative, relativeOnly) {

            var scheme = RFC3986.scheme;
            var prefix = void 0;

            if (relativeOnly) {
                prefix = '(?:' + RFC3986.relativeRef + ')';
            } else {
                // If we were passed a scheme, use it instead of the generic one
                if (optionalScheme) {

                    // Have to put this in a non-capturing group to handle the OR statements
                    scheme = '(?:' + optionalScheme + ')';
                }

                var withScheme = '(?:' + scheme + ':' + RFC3986.hierPart + ')';

                prefix = allowRelative ? '(?:' + withScheme + '|' + RFC3986.relativeRef + ')' : withScheme;
            }

            /**
             * URI = scheme ":" hier-part [ "?" query ] [ "#" fragment ]
             *
             * OR
             *
             * relative-ref = relative-part [ "?" query ] [ "#" fragment ]
             */
            return new RegExp('^' + prefix + '(?:\\?' + RFC3986.query + ')?' + '(?:#' + RFC3986.fragment + ')?$');
        }
    }
};

module.exports = internals.Uri;
