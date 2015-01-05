"use strict";

/**
 * Extends io by adding the method `readXML` to it.
 * Should be called using  the provided `mergeInto`-method like this:
 *
 * @example
 * var IO = require("io");
 * var IOassets = require("io-assets");
 * IOassets.mergeInto(IO);
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module io
 * @submodule io-assets
 * @class IO
 * @since 0.0.1
*/

// var NAME = '[io-assets]: ';

require('js-ext/lib/object.js');

module.exports = function (window) {

    var IO = require('../io.js')(window);

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', {});

    if (window._ITSAmodules.IO_Assets) {
        return IO; // IO_Assets was already created
    }

    window._ITSAmodules.IO_Assets = IO;

    /**
     * Creates a `<style>` tag to load the CSS file at the given url.
     *
     * @method getCSS
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
    IO.getCSS = function(/* url, options */) {
    };

    /**
     * Creates a `<script>` tag to load the script at the given url.
     *
     * @method getJS
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
    IO.getJS = function(/* url, options */) {
    };

    return IO;
};