"use strict";

/**
 * Extends io by adding the method `readObjectJSONP` to it.
 * (under construction)
 *
 * @example
 * var IO = require("io/extra/io-jsonp.js")(window);
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module io
 * @submodule io-jsonp
 * @class IO
 * @since 0.0.1
*/

require('js-ext/lib/object.js');

var createHashMap = require('js-ext/extra/hashmap.js').createMap;

module.exports = function (window) {

    var IO = require('../io.js')(window);

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());

    if (window._ITSAmodules.IO_JSONP) {
        return IO; // IO_JSONP was already created
    }

    window._ITSAmodules.IO_JSONP = IO;

    /**
     * Creates a `<style>` tag to load the CSS file at the given url.
     *
     * @method readObjectJSONP
     * @param url {String} URL of the style sheet  to load
     * @param [options] {Object}
     *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
     *    @param [options.headers] {Object} HTTP request headers.
     *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
     * @return {Promise} Promise holding the request. Has an additional .abort() method to cancel the request.
     * <ul>
     *     <li>on success: xhr {XMLHttpRequest1|XMLHttpRequest2} xhr-response</li>
     *     <li>on failure: reason {Error}</li>
     * </ul>
    */
    IO.readObjectJSONP = function(url, options) {
        // var callback = idgenerator('JSONP');
        return this.getJS(url, options).then(
            function(response) {
                // not 'try' 'catch', because, if parsing fails, we actually WANT the promise to be rejected
                return JSON.parse(response);
            }
        );
    };

    return IO;
};