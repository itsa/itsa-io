/* globals XMLHttpRequest:true */

/**
 * Provides core IO-functionality.
 *
 * The returned xhr DOES support CORS for all modern browsers.
 * To use CORS, you need to setup the responseserver right
 * More info about CORS: http://remysharp.com/2011/04/21/getting-cors-working/
 *
 *
 *
 *
 * TODO: make STREAMING with IE9-browsers work: the XDomainRequest() seems not to fire the onprogress-event...
 *       (and XMLHttpRequest1 doesn't have this event at all)
 * TODO: make CORS with IE9-browsers work: the XDomainRequest() fails currently on cors..
 *
 *
 *
 *
 * Using CORS with IE9-browsers need special consideration, for it uses the XDomainRequest():
 * 1. Only GET and POST methods are supported. Other methods will be reset into one of these,
 *    so make sure the cross-domain-server handles all requests as being send with the GET or POST method.
 * 2. Only text/plain is supported for the request's Content-Type header. This will lead into troubles when handling
 *    POST-requests: the cross-domain-server needs to extract the parameters itself. For nodejs, there is a nice npm module:
 *    `express-ie-cors` https://github.com/advanced/express-ie-cors/blob/master/lib/express-ie-cors.js
 * 3. No custom headers can be added to the request.
 * 4. No authentication or cookies will be sent with the request.
 * more info: http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
 *
 * @module io
 * @submodule io-win
 * @class IO
*/

/* global module:false */

"use strict";

require('ypromise');
require('extend-js');

var NAME = '[io]: ',
    GET = 'GET',
    DEF_REQ_TIMEOUT = 300000, // don't create an ever-lasting request: always quit after 5 minutes
    BODY_METHODS = {
        POST: 1,
        PUT: 1
    },
    CONTENT_TYPE = 'Content-Type',
    MIME_JSON = 'application/json',
    DEF_CONTENT_TYPE_POST = 'application/x-www-form-urlencoded; charset=UTF-8',
    ERROR_NO_XHR = 'no valid xhr transport-mechanism available',
    REQUEST_TIMEOUT = 'Request-timeout',
    UNKNOW_ERROR = 'Unknown response-error',
    XHR_ERROR = 'XHR Error',
    ABORTED = 'Request aborted',
    NO_XHR = 'No valid xhr found on this browser';

module.exports = function (window) {

    // to prevent multiple IO instances
    // (which might happen: http://nodejs.org/docs/latest/api/modules.html#modules_module_caching_caveats)
    // we make sure IO is defined only once. Therefore we bind it to `window` and return it if created before
    // We need a singleton IO, because submodules might merge in. You can't have them merging
    // into some other IO-instance than which is used.
    var Glob = (typeof global !== 'undefined' ? global : /* istanbul ignore next */ this);
    if (!Glob._parcelaModules) {
        Object.defineProperty(Glob, '_parcelaModules', {
            configurable: false,
            enumerable: false,
            writable: false,
            value: {} // `writable` is false means we cannot chance the value-reference, but we can change {} its members
        });
    }
    if (Glob._parcelaModules.IO) {
        return Glob._parcelaModules.IO;
    }

    var ENCODE_URI_COMPONENT = encodeURIComponent,
        IO;

    IO = {
        config: {},

        //===============================================================================================
        // private methods:
        //===============================================================================================

        _xhrList: [],

        /**
         * Initializes the xhr-instance, based on the config-params.
         * This method is the standard way of doing xhr-requests without processing streams.
         *
         * @method _initXHR
         * @param xhr {Object} xhr-instance
         * @param options {Object}
         *    @param [options.url] {String} The url to which the request is sent.
         *    @param [options.method='GET'] {String} The HTTP method to use.
         *    can be ignored, even if streams are used --> the returned Promise will always hold all data
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *           This feature only works in the browser: nodejs will always perform asynchronous requests.
         *    @param [options.data] {Object} Data to be sent to the server, either to be used by `query-params` or `body`.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.responseType] {String} Force the response type.
         *    @param [options.timeout=3000] {number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         * @param fulfill {Function} reference to xhr-promise's fulfill-function
         * @param reject {Function} reference to xhr-promise's reject-function
         * @param promise {Promise} the xhr-promise which will be extended with the `abort()`-method
         * @private
        */
        _initXHR: function (xhr, options, promise) {
            console.log(NAME, '_initXHR');
            var instance = this,
                url = options.url,
                method = options.method || GET,
                headers = options.headers || {}, // all request will get some headers
                async = !options.sync,
                data = options.data,
                reject = promise.reject;
            // xhr will be null in case of a CORS-request when no CORS is possible
            if (!xhr) {
                console.error(NAME, '_initXHR fails: '+ERROR_NO_XHR);
                reject(new Error(ERROR_NO_XHR));
                return;
            }
            console.log(NAME, '_initXHR succesfully created '+(xhr._isXHR2 ? 'XMLHttpRequest2' : (xhr._isXDR ? 'XDomainRequest' : 'XMLHttpRequest1'))+'-instance');

            // method-name should be in uppercase:
            method = method.toUpperCase();

            // in case of BODY-method: eliminate any data behind querystring:
            // else: append data-object behind querystring
            if (BODY_METHODS[method]) {
                url = url.split('?'); // now url is an array
                url = url[0]; // now url is a String again
            }
            else if (data) {
                url += ((url.indexOf('?') > 0) ? '&' : '?') + instance._toQueryString(data);
            }

            xhr.open(method, url, async);
            // xhr.responseType = options.responseType || 'text';
            options.withCredentials && (xhr.withCredentials=true);


            // more initialisation might be needed by extended modules:
            instance._xhrInitList.each(
                function(fn) {
                    fn(xhr, promise, headers, method);
                }
            );

            // send the request:
            xhr.send((BODY_METHODS[method] && data) ? (((headers[CONTENT_TYPE]===MIME_JSON) || xhr._isXDR) ? JSON.stringify(data) : instance._toQueryString(data)) : null);

            console.log(NAME, 'xhr send to '+url+' with method '+method);

            // now add xhr.abort() to the promise, so we can call from within the returned promise-instance
            promise.abort = function() {
                console.log(NAME, 'xhr aborted');
                reject(new Error(ABORTED));
                xhr._aborted = true; // must be set: IE9 won't allow to read anything on xhr after being aborted
                xhr.abort();
            };

            // in case synchronous transfer: force an xhr.onreadystatechange:
            async || xhr.onreadystatechange();
        },

        /**
         * Adds the `headers`-object to `xhr`-headers.
         *
         * @method _setHeaders
         * @param xhr {Object} containing the xhr-instance
         * @param headers {Object} containing all headers
         * @param method {String} the request-method used
         * @private
        */
        _setHeaders: function(xhr, promise, headers, method) {
            // XDR cannot set requestheaders, only XHR:
            if (!xhr._isXDR) {
                console.log(NAME, '_setHeaders');
                var name;
                if ((method!=='POST') && (method!=='PUT')) {
                    // force GET-request to make a request instead of using cache (like IE does):
                    headers['If-Modified-Since'] = 'Wed, 15 Nov 1995 01:00:00 GMT';
                    // header 'Content-Type' should only be set with POST or PUT requests:
                    delete headers[CONTENT_TYPE];
                }
                // set all headers
                for (name in headers) {
                    xhr.setRequestHeader(name, headers[name]);
                }

                // in case of POST or PUT method: always make sure 'Content-Type' is specified
                ((method!=='POST') && (method!=='PUT')) || (headers && (CONTENT_TYPE in headers)) || xhr.setRequestHeader(CONTENT_TYPE, DEF_CONTENT_TYPE_POST);
            }
        },

        /**
         * Adds 2 methods on the xhr-instance which are used by xhr when events occur:
         *
         * xhr.onreadystatechange()
         * xhr.ontimeout()  // only XMLHttpRequest2
         *
         * These events are responsible for making the Promise resolve.
         * @method _setReadyHandle
         * @param xhr {Object} containing the xhr-instance
         * @param fulfill {Function} reference to the Promise fulfill-function
         * @param reject {Function} reference to the Promise reject-function
         * @private
        */
        _setReadyHandle: function(xhr, promise) {
            console.log(NAME, '_setReadyHandle');
            // for XDomainRequest, we need 'onload' instead of 'onreadystatechange'
            xhr.onreadystatechange = function() {
                // CANNOT console xhr.responseText here! IE9 will throw an error:
                // you can only acces it after (xhr.readyState===4)
                // also check xhr._aborted --> IE9 comes here after aborted and will throw an error when reading xhr's native properties
                if (!xhr._aborted && (xhr.readyState===4)) {
                    clearTimeout(xhr._timer);
                    if ((xhr.status>=200) && (xhr.status<300)) {
                        console.log(NAME, 'xhr.onreadystatechange will fulfill xhr-instance: '+xhr.responseText);
                        promise.fulfill(xhr);
                    }
                    else {
                        console.warn(NAME, 'xhr.onreadystatechange will reject xhr-instance: '+xhr.statusText);
                        promise.reject(new Error(xhr.statusText || UNKNOW_ERROR+' '+xhr.status));
                    }
                }
            };
            xhr.onerror = function() {
                clearTimeout(xhr._timer);
                promise.reject(new Error(XHR_ERROR));
            };
        },

        /**
         * Stringifies an object into one string with every pair separated by `&`
         *
         * @method _toQueryString
         * @param data {Object} containing key-value pairs
         * @return {String} stringified presentation of the object, with every pair separated by `&`
         * @private
        */
        _toQueryString: function(data) {
            var paramArray = [],
                key, value;
        // TODO: use `object` module
            for (key in data) {
                value = data[key];
                key = ENCODE_URI_COMPONENT(key);
                paramArray.push((value === null) ? key : (key + '=' + ENCODE_URI_COMPONENT(value)));
            }
            console.log(NAME, '_toQueryString --> '+paramArray.join('&'));
            return paramArray.join('&');
        },

        /**
         * Sends a HTTP request to the server and returns a Promise with an additional .abort() method to cancel the request.
         * This method is the standard way of doing xhr-requests without processing streams.
         *
         * @method request
         * @param options {Object}
         *    @param [options.url] {String} The url to which the request is sent.
         *    @param [options.method='GET'] {String} The HTTP method to use.
         *    can be ignored, even if streams are used --> the returned Promise will always hold all data
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.data] {Object} Data to be sent to the server, either to be used by `query-params` or `body`.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.responseType] {String} Force the response type.
         *    @param [options.timeout=3000] {number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         *    @param [options.streamback] {Function} callbackfunction in case you want to process streams (needs io-stream module).
         * @return {Promise} Promise holding the request. Has an additional .abort() method to cancel the request.
         * <ul>
         *     <li>on success: xhr {XMLHttpRequest1|XMLHttpRequest2} xhr-response</li>
         *     <li>on failure: reason {Error}</li>
         * </ul>
        */
        request: function(options) {
            console.log(NAME, 'request');
            var instance = this,
                props = {},
                xhr, promise;
            options || (options={});

            xhr = new window.XMLHttpRequest();
            props._isXHR2 = ('withCredentials' in xhr) || (window.navigator.userAgent==='fake');
            // it could be other modules like io-cors or io-stream have subscribed
            // xhr might be changed, also private properties might be extended
            instance._xhrList.each(
                function(fn) {
                    xhr = fn(xhr, props, options);
                }
            );
            if (!xhr) {
                return Promise.reject(NO_XHR);
            }
            xhr.merge(props);
            console.log(NAME, 'request creating xhr of type: '+ (props._isXHR2 ? 'XMLHttpRequest2' : (props._isXDR ? 'XDomainRequest' : 'XMLHttpRequest1')));
            console.log(NAME, 'CORS-IE: '+ props._CORS_IE + ', canStream: '+props._canStream);

            promise = Promise.manage(options.streamback);

            // Don't use xhr.timeout --> IE<10 throws an error when set xhr.timeout
            // We use a timer that aborts the request
            Object.defineProperty(xhr, '_timer', {
                configurable: false,
                enumerable: false,
                writable: false,
                value: setTimeout(function() {
                           promise.reject(new Error(REQUEST_TIMEOUT));
                           xhr._aborted = true; // must be set: IE9 won't allow to read anything on xhr after being aborted
                           xhr.abort();
                       }, options.timeout || instance.config.reqTimeout || DEF_REQ_TIMEOUT)
            });

            instance._initXHR(xhr, options, promise);
            return promise;
        }
    };

    IO._xhrInitList = [
        IO._setReadyHandle,
        IO._setHeaders
    ];

    Glob._parcelaModules.IO = IO;

    return IO;
};