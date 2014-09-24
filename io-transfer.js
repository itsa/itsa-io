"use strict";

/**
 * Extends io by adding the method `readXML` to it.
 * Should be called using  the provided `mergeInto`-method like this:
 *
 * @example
 * var IO = require("io");
 * var IOtransfer = require("io-transfer");
 * IOtransfer.mergeInto(IO);
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module io
 * @submodule io-transfer
 * @class IO
 * @since 0.0.1
*/

var NAME = '[io-transfer]: ',
    DATEPATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
    REVIVER = function(key, value) {
        return DATEPATTERN.test(value) ? new Date(value) : value;
    },
    MIME_JSON = 'application/json',
    CONTENT_TYPE = 'Content-Type',
    DELETE = 'delete',

IO_TRANSFER = {
    mergeInto: function (ioInstance) {
        /**
         * Performs an AJAX GET request.  Shortcut for a call to [`xhr`](#method_xhr) with `method` set to  `'GET'`.
         * Additional parameters can be on the url (with questionmark), through `params`, or both.
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note: `params` should be a plain object with only primitive types which are transformed into key/value pairs.
         *
         * @method get
         * @param url {String} URL of the resource server
         * @param [params] {Object} additional parameters.
         *        should be a plain object with only primitive types which are transformed into key/value pairs.
         * @param [options] {Object}
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.responseType] {String} Force the response type.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         * @return {Promise}
         * on success:
            * xhr {XMLHttpRequest|XDomainRequest} xhr-response
         * on failure an Error object
            * reason {Error}
        */

        ioInstance.get = function (url, options) {
            console.log(NAME, 'get --> '+url);
            var ioPromise, returnPromise;
            options || (options={});
            options.url = url;
            options.method = 'GET';
            // delete hidden property `data`: don't want accedentially to be used
            delete options.data;
            ioPromise = this.request(options);
            returnPromise = ioPromise.then(
                function(xhrResponse) {
                    return xhrResponse.responseText;
                }
            );
            // set `abort` to the thennable-promise:
            returnPromise.abort = ioPromise.abort;
            return returnPromise;
        };

        /**
         * Performs an AJAX request with the GET HTTP method and expects a JSON-object.
         * The resolved Promise-callback returns an object (JSON-parsed serverresponse).
         *
         * Additional request-parameters can be on the url (with questionmark), through `params`, or both.
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note1: If you expect the server to response with data that consist of Date-properties, you should set `options.parseJSONDate` true.
         *        Parsing takes a bit longer, but it will generate trully Date-objects.
         * Note2: CORS is supported, as long as the responseserver is set up to:
         *       a) has a response header which allows the clientdomain:
         *          header('Access-Control-Allow-Origin: http://www.some-site.com'); or header('Access-Control-Allow-Origin: *');
         *       b) in cae you have set a custom HEADER (through 'options'), the responseserver MUST listen and respond
         *          to requests with the OPTION-method
         *       More info:  allows to send to your domain: see http://remysharp.com/2011/04/21/getting-cors-working/
         *
         * @method read
         * @param url {String} URL of the resource server
         * @param [params] {Object} additional parameters.
         * @param [options] {Object} See also: [`I.io`](#method_xhr)
         *    can be ignored, even if streams are used --> the returned Promise will always hold all data
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         *    @param [options.parseJSONDate=false] {boolean} Whether the server returns JSON-stringified data which has Date-objects.
         * @return {Promise}
         * on success:
            * Object received data
         * on failure an Error object
            * reason {Error}
        */
        ioInstance.read = function(url, params, options) {
            console.log(NAME, 'read  --> '+url+' params: '+JSON.stringify(params));
            var ioPromise, returnPromise;
            options || (options={});
            options.headers || (options.headers={});
            options.url = url;
            options.method = 'GET';
            options.data = params;
            options.headers.Accept = 'application/json';
            // we don't want the user to re-specify the server's responsetype:
            delete options.responseType;
            ioPromise = this.request(options);
            returnPromise = ioPromise.then(
                function(xhrResponse) {
                    // not 'try' 'catch', because, if parsing fails, we actually WANT the promise to be rejected
                    // we also need to re-attach the 'abort-handle'
                    console.log(NAME, 'read returns with: '+JSON.stringify(xhrResponse.responseText));
                    // xhrResponse.responseText should be 'application/json' --> if it is not,
                    // JSON.parse throws an error, but that's what we want: the Promise would reject
                    return JSON.parse(xhrResponse.responseText, (options.parseJSONDate) ? REVIVER : null);
                }
            );
            // set `abort` to the thennable-promise:
            returnPromise.abort = ioPromise.abort;
            return returnPromise;
        };


        /**
         * Sends data (object) which will be JSON-stringified before sending.
         * Performs an AJAX request with the PUT HTTP method by default.
         * When options.allfields is `false`, it will use the POST-method: see Note2.
         *
         * The 'content-type' of the header is set to 'application/json', overruling manually options.
         *
         * 'data' is send as 'body.data' and should be JSON-parsed at the server.
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note1: The server needs to inspect the bodyparam: 'action', which always equals 'update'.
         *        'body.action' is the way to distinquish 'I.IO.updateObject' from 'I.IO.insertObject'.
         *        On purpose, we didn't make this distinction through a custom CONTENT-HEADER, because
         *        that would lead into a more complicated CORS-setup (see Note3)
         * Note2: By default this method uses the PUT-request: which is preferable is you send the WHOLE object.
         *        if you send part of the fields, set `options.allfields`=false.
         *        This will lead into using the POST-method.
         *        More about HTTP-methods: https://stormpath.com/blog/put-or-post/
         * Note3: CORS is supported, as long as the responseserver is set up to:
         *        a) has a response header which allows the clientdomain:
         *           header('Access-Control-Allow-Origin: http://www.some-site.com'); or header('Access-Control-Allow-Origin: *');
         *        b) in cae you have set a custom HEADER (through 'options'), the responseserver MUST listen and respond
         *           to requests with the OPTION-method
         *        More info:  allows to send to your domain: see http://remysharp.com/2011/04/21/getting-cors-working/
         * Note4: If the server response JSON-stringified data, the Promise resolves with a JS-Object. If you expect this object
         *        to consist of Date-properties, you should set `options.parseJSONDate` true. Parsing takes a bit longer, but it will
         *        generate trully Date-objects.
         *
         *
         * @method update
         * @param url {String} URL of the resource server
         * @param data {Object|Promise} Data to be sent, might be a Promise which resolves with the data-object.
         * @param [options] {Object} See also: [`I.io`](#method_xhr)
         *    @param [options.allfields=true] {boolean} to specify that all the object-fields are sent.
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         *    @param [options.parseJSONDate=false] {boolean} Whether the server returns JSON-stringified data which has Date-objects.
         * @return {Promise}
         * on success:
            * response {Object} usually, the final object-data, possibly modified
         * on failure an Error object
            * reason {Error}
        */

        /**
         * Performs an AJAX request with the POST HTTP method by default.
         * When options.allfields is `true`, it will use the PUT-method: see Note2.
         * The send data is an object which will be JSON-stringified before sending.
         *
         * The 'content-type' of the header is set to 'application/json', overruling manually options.
         *
         * 'data' is send as 'body.data' and should be JSON-parsed at the server.
         * 'body.action' has the value 'insert'
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note1: The server needs to inspect the bodyparam: 'action', which always equals 'insert'.
         *        'body.action' is the way to distinquish 'I.IO.insertObject' from 'I.IO.updateObject'.
         *        On purpose, we didn't make this distinction through a custom CONTENT-HEADER, because
         *        that would lead into a more complicated CORS-setup (see Note3)
         * Note2: By default this method uses the POST-request: which is preferable if you don't know all the fields (like its unique id).
         *        if you send ALL the fields, set `options.allfields`=true.
         *        This will lead into using the PUT-method.
         *        More about HTTP-methods: https://stormpath.com/blog/put-or-post/
         * Note3: CORS is supported, as long as the responseserver is set up to:
         *        a) has a response header which allows the clientdomain:
         *           header('Access-Control-Allow-Origin: http://www.some-site.com'); or header('Access-Control-Allow-Origin: *');
         *        b) in cae you have set a custom HEADER (through 'options'), the responseserver MUST listen and respond
         *           to requests with the OPTION-method
         *        More info:  allows to send to your domain: see http://remysharp.com/2011/04/21/getting-cors-working/
         * Note4: If the server response JSON-stringified data, the Promise resolves with a JS-Object. If you expect this object
         *        to consist of Date-properties, you should set `options.parseJSONDate` true. Parsing takes a bit longer, but it will
         *        generate trully Date-objects.
         *
         * @method insert
         * @param url {String} URL of the resource server
         * @param data {Object|Promise} Data to be sent, might be a Promise which resolves with the data-object.
         * @param [options] {Object} See also: [`I.io`](#method_xhr)
         *    @param [options.allfields=false] {boolean} to specify that all the object-fields are sent.
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         *    @param [options.parseJSONDate=false] {boolean} Whether the server returns JSON-stringified data which has Date-objects.
         * @return {Promise}
         * on success:
            * response {Object} usually, the final object-data, possibly modified, holding the key
         * on failure an Error object
            * reason {Error}
        */

        /**
         * Performs an AJAX request with the PUT HTTP method by default.
         * When options.allfields is `false`, it will use the POST-method: see Note2.
         * The send data is an object which will be JSON-stringified before sending.
         *
         * The 'content-type' of the header is set to 'application/json', overruling manually options.
         *
         * 'data' is send as 'body.data' and should be JSON-parsed at the server.
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note1: By default this method uses the PUT-request: which is preferable is you send the WHOLE object.
         *        if you send part of the fields, set `options.allfields`=false.
         *        This will lead into using the POST-method.
         *        More about HTTP-methods: https://stormpath.com/blog/put-or-post/
         * Note2: CORS is supported, as long as the responseserver is set up to:
         *        a) has a response header which allows the clientdomain:
         *           header('Access-Control-Allow-Origin: http://www.some-site.com'); or header('Access-Control-Allow-Origin: *');
         *        b) in cae you have set a custom HEADER (through 'options'), the responseserver MUST listen and respond
         *           to requests with the OPTION-method
         *        More info:  allows to send to your domain: see http://remysharp.com/2011/04/21/getting-cors-working/
         * Note3: If the server response JSON-stringified data, the Promise resolves with a JS-Object. If you expect this object
         *        to consist of Date-properties, you should set `options.parseJSONDate` true. Parsing takes a bit longer, but it will
         *        generate trully Date-objects.
         *
         * @method send
         * @param url {String} URL of the resource server
         * @param data {Object} Data to be sent.
         * @param [options] {Object} See also: [`I.io`](#method_xhr)
         *    @param [options.allfields=true] {boolean} to specify that all the object-fields are sent.
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         * @return {Promise}
         * on success:
            * response {Object|String} any response you want the server to return.
                       If the server send back a JSON-stringified object, it will be parsed to return as a full object
                       You could set `options.parseJSONDate` true, it you want ISO8601-dates to be parsed as trully Date-objects
         * on failure an Error object
            * reason {Error}
        */

        ['update', 'insert', 'send'].forEach(
            function (verb) {
                ioInstance[verb] = function (url, data, options) {
                    console.log(NAME, verb+' --> '+url+' data: '+JSON.stringify(data));
                    var instance = this,
                        allfields, useallfields, parseJSONDate, ioPromise, returnPromise;
                    options || (options={});
                    allfields = options.allfields,
                    useallfields = (typeof allfields==='boolean') ? allfields : (verb!=='insert');
                    parseJSONDate = options.parseJSONDate;
                    options.url = url;
                    options.method = useallfields ? 'PUT' : 'POST';
                    options.data = data;
                    options.headers || (options.headers={});
                    options.headers[CONTENT_TYPE] = MIME_JSON;
                    parseJSONDate && (options.headers['X-JSONDate']="true");
                    if (verb!=='send') {
                        options.headers.Accept = 'application/json';
                        // set options.action
                        options.headers['X-Action'] = verb;
                        // we don't want the user to re-specify the server's responsetype:
                        delete options.responseType;
                    }
                    ioPromise = instance.request(options);
                    returnPromise = ioPromise.then(
                        function(xhrResponse) {
                            if (verb==='send') {
                                return xhrResponse.responseText;
                            }
                            // In case of `insert` or `update`
                            // xhrResponse.responseText should be 'application/json' --> if it is not,
                            // JSON.parse throws an error, but that's what we want: the Promise would reject
                            return JSON.parse(xhrResponse.responseText, parseJSONDate ? REVIVER : null);
                        }
                    );
                    // set `abort` to the thennable-promise:
                    returnPromise.abort = ioPromise.abort;
                    return returnPromise;
                };
            }
        );

        /**
         * Performs an AJAX DELETE request.  Shortcut for a call to [`xhr`](#method_xhr) with `method` set to  `'DELETE'`.
         *
         * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
         * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
         *
         * Note: `data` should be a plain object with only primitive types which are transformed into key/value pairs.
         *
         * @method delete
         * @param url {String} URL of the resource server
         * @param deleteKey {Object} Indentification of the id that has to be deleted. Typically an object like: {id: 12}
         *                  This object will be passed as the request params.
         * @param [options] {Object}
         *    @param [options.url] {String} The url to which the request is sent.
         *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
         *    @param [options.params] {Object} Data to be sent to the server.
         *    @param [options.body] {Object} The content for the request body for POST method.
         *    @param [options.headers] {Object} HTTP request headers.
         *    @param [options.timeout=3000] {Number} to timeout the request, leading into a rejected Promise.
         *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
         * @return {Promise}
         * on success:
            * xhr {XMLHttpRequest|XDomainRequest} xhr-response
         * on failure an Error object
            * reason {Error}
        */

        ioInstance[DELETE] = function (url, deleteKey, options) {
            console.log(NAME, 'delete --> '+url+' deleteKey: '+JSON.stringify(deleteKey));
            var ioPromise, returnPromise;
            options || (options={});
            options.url = url;
            // method will be uppercased by IO.xhr
            options.method = DELETE;
            options.data = deleteKey;
            delete options.responseType;
            ioPromise = this.request(options);
            returnPromise = ioPromise.then(
                function(xhrResponse) {
                    var response = xhrResponse.responseText;
                    try {
                        response = JSON.parse(response, (options.parseJSONDate) ? REVIVER : null);
                    }
                    catch(err) {}
                    return response;
                }
            );
            // set `abort` to the thennable-promise:
            returnPromise.abort = ioPromise.abort;
            return returnPromise;
        };

    }
};

module.exports = IO_TRANSFER;