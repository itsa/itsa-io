"use strict";

/**
 * Extends io by adding the method `readXML` to it.
 * Should be called using  the provided `mergeInto`-method like this:
 *
 * @example
 * var IO = require("io");
 * var IOjsonp = require("io-jsonp");
 * IOjsonp.mergeInto(IO);
 *
 * @module io
 * @submodule io-jsonp
 * @class IO
 * @since 0.0.1
 *
 * <i>Copyright (c) 2014 Parcela - https://github.com/Parcela</i>
 * New BSD License - https://github.com/ItsAsbreuk/itsa-library/blob/master/LICENSE
 *
*/

var NAME = '[io-jsonp]: ',
    idgenerator = require('utils').idgenerator,

IO_JSONP = {
    mergeInto: function (ioInstance) {
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
        ioInstance.readObjectJSONP = function(url, options) {
            var callback = idgenerator('JSONP');
            return this.getJS(url, options).then(
                function(response) {
                    // not 'try' 'catch', because, if parsing fails, we actually WANT the promise to be rejected
                    return JSON.parse(response);
                }
            );
        };
    }
};

module.exports = IO_JSONP;