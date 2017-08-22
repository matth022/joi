'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Ref = require('./ref');

module.exports = function () {
    function Set() {
        _classCallCheck(this, Set);

        this._set = [];
    }

    Set.prototype.add = function add(value, refs) {

        if (!Ref.isRef(value) && this.has(value, null, null, false)) {

            return;
        }

        if (refs !== undefined) {
            // If it's a merge, we don't have any refs
            Ref.push(refs, value);
        }

        this._set.push(value);
        return this;
    };

    Set.prototype.merge = function merge(add, remove) {

        for (var i = 0; i < add._set.length; ++i) {
            this.add(add._set[i]);
        }

        for (var _i = 0; _i < remove._set.length; ++_i) {
            this.remove(remove._set[_i]);
        }

        return this;
    };

    Set.prototype.remove = function remove(value) {

        this._set = this._set.filter(function (item) {
            return value !== item;
        });
        return this;
    };

    Set.prototype.has = function has(value, state, options, insensitive) {

        for (var i = 0; i < this._set.length; ++i) {
            var items = this._set[i];

            if (state && Ref.isRef(items)) {
                // Only resolve references if there is a state, otherwise it's a merge
                items = items(state.reference || state.parent, options);
            }

            if (!Array.isArray(items)) {
                items = [items];
            }

            for (var j = 0; j < items.length; ++j) {
                var item = items[j];
                if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== (typeof item === 'undefined' ? 'undefined' : _typeof(item))) {
                    continue;
                }

                if (value === item || value instanceof Date && item instanceof Date && value.getTime() === item.getTime() || insensitive && typeof value === 'string' && value.toLowerCase() === item.toLowerCase() || Buffer.isBuffer(value) && Buffer.isBuffer(item) && value.length === item.length && value.toString('binary') === item.toString('binary')) {

                    return true;
                }
            }
        }

        return false;
    };

    Set.prototype.values = function values(options) {

        if (options && options.stripUndefined) {
            var values = [];

            for (var i = 0; i < this._set.length; ++i) {
                var item = this._set[i];
                if (item !== undefined) {
                    values.push(item);
                }
            }

            return values;
        }

        return this._set.slice();
    };

    Set.prototype.slice = function slice() {

        var newSet = new Set();
        newSet._set = this._set.slice();

        return newSet;
    };

    Set.prototype.concat = function concat(source) {

        var newSet = new Set();
        newSet._set = this._set.concat(source._set);

        return newSet;
    };

    return Set;
}();
