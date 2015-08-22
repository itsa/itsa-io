"use strict";

/**
 * Extends io by adding the method `sendBlob` to it.
 *
 * @example
 * var IO = require("io/extra/io-filetransfer.js")(window);
 *
 *
 * <i>Copyright (c) 2015 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module io
 * @submodule io-filetransfer
 * @class IO
 * @since 0.0.1
*/

require('js-ext/lib/object.js');
require('js-ext/lib/promise.js');

var NAME = '[io-filetransfer]: ',
    GENERATOR_ID = 'ITSA-FILETRANS',
    MIME_BLOB = 'application/octet-stream',
    CONTENT_TYPE = 'Content-Type',
    createHashMap = require('js-ext/extra/hashmap.js').createMap,
    idGenerator = require('utils').idGenerator,
    SPINNER_ICON = 'spinnercircle-anim',
    DEFAULT_TIMEOUT = 300000, // 5 minutes
    MIN_SHOWUP = 500,
    REVIVER = function(key, value) {
        return ((typeof value==='string') && value.toDate()) || value;
    },
    messages = require('messages'),
    MESSAGES = {
        'read': 'reading...',
        'update': 'saving...',
        'insert': 'saving...',
        'send': 'sending...',
        'delete': 'saving...'
    },
    ABORTED = 'Request aborted',
    KB_25 = 25 * 1024, // 25kb
    KB_100 = 100 * 1024, // 100kb
    KB_256 = 256 * 1024, // 256kb
    MB_1 = 1025 * 1024, // 1Mb
    MB_20 = 20 * MB_1; // 20Mb


module.exports = function (window) {

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());

    if (window._ITSAmodules.IO_Filetransfer) {
        return window._ITSAmodules.IO_Filetransfer; // IO_Filetransfer was already created
    }

    var IO = require('../io.js')(window),
        clientIdPromiseOriginal, clientIdPromise, _entendXHR, _progressHandle;

    window._ITSAmodules.IO_Filetransfer = IO;


    /*
     * Adds properties to the xhr-object: in case of streaming,
     * xhr._isStream is set and xhr._isXDR might be set in case of IE<10
     *
     * @method _entendXHR
     * @param xhr {Object} containing the xhr-instance
     * @param props {Object} the propertie-object that is added too xhr and can be expanded
     * @param options {Object} options of the request
     * @private
    */
    _entendXHR = function(xhr, props, options /*, promise */) {
        props._isUpload = (typeof options.progressfn === 'function');
        return xhr;
    },

    /*
     * Adds extra initialisation of the xhr-object: in case of streaming,
     * an `onprogress`-handler is set up
     *
     * @method _progressHandle
     * @param xhr {Object} containing the xhr-instance
     * @param promise {Promise} reference to the Promise created by xhr
     * @private
    */
    _progressHandle = function(xhr, promise /*, headers, method */) {
        if (xhr._isUpload) {
            console.log(NAME, 'progressHandle upload');
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    // promise.callback(data);
                    console.log('file upload-progress: '+e.loaded+'/'+e.total);
                    promise._loaded = e.loaded;
                    promise._notify();
                }
            };
        }
    },

    /**
     * Is send to the server and expects an unique id which can be used for its file-transactions.
     *
     * @method _getClientId
     * @private
     * @param url {String} URL of the resource server
     * @return {Promise}
     * on success:
        * Unique clientId
     * on failure an Error object
        * reason {Error}
    */
    IO._getClientId = function(url) {
        var options;
        // check for existance, but also if it was not rejected --> in that case we need to reactivate
        // (the server might have been coming up again)
        if (clientIdPromiseOriginal && !clientIdPromiseOriginal.isRejected()) {
            return clientIdPromise;
        }
        options = {
            url: url,
            method: 'GET',
            data: {
                ts: Date.now() // prevent caching
            }
        };
        clientIdPromiseOriginal = this.request(options);
        clientIdPromise = clientIdPromiseOriginal.then(function(xhrResponse) {
            return xhrResponse.responseText;
        }).catch(function(err) {
            console.warn(err);
            throw new Error(err);
        });
        return clientIdPromise;
    };

    /**
     * Sends a `blob` by using an AJAX PUT request.
     * Additional parameters can be through the `params` argument.
     *
     * The Promise gets fulfilled if the server responses with `STATUS-CODE` in the 200-range (excluded 204).
     * It will be rejected if a timeout occurs (see `options.timeout`), or if `xhr.abort()` gets invoked.
     *
     * Note: `params` should be a plain object with only primitive types which are transformed into key/value pairs.
     *
     * @method sendBlob
     * @param url {String} URL of the resource server
     * @param blob {blob} blob (data) representing the file to be send. Typically `HTMLInputElement.files[0]`
     * @param [params] {Object} additional parameters. NOTE: this object will be `stringified` set a HEADER: `x-data` on the request!
     *        should be a plain object with only primitive types which are transformed into key/value pairs.
     * @param [options] {Object}
     *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
     *    @param [options.headers] {Object} HTTP request headers.
     *    @param [options.timeout=300000] {Number} to timeout the request, leading into a rejected Promise. Defaults to 5 minutes
     *    @param [options.progressfn] {Function} callbackfunction in case you want to process upload-status.
     *           Function has 3 parameters: total, loaded and target (io-promise)
     *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
     *    @param [options.parseJSONDate=false] {boolean} Whether the server returns JSON-stringified data which has Date-objects.
     * @return {Promise}
     * on success:
        * Object any received data
     * on failure an Error object
        * reason {Error}
    */
    IO.sendBlob = function (url, blob, params, options) {
        console.log(NAME, 'get --> '+url);
        var instance = this,
            start = 0,
            promiseHash = [],
            ioHash = [],
            i = 0,
            chunkSize, end, size, returnPromise, message, filename, headers, notify,
            ioPromise, partialSize, notifyResolved, hashPromise, responseObject, setXHR;
        if (!IO.supportXHR2) {
            return Promise.reject('This browser does not support fileupload');
        }
        if (!blob instanceof window.Blob) {
            return Promise.reject('No proper fileobject');
        }
        if (!url || !url.validateURL()) {
            return Promise.reject('No valid url specified');
        }

        // send a notification to `progressfn` whenever a chunk gets intermediate update
        // by `xhr.upload.onprogress`
        notify = function() {
            var len = promiseHash.length,
                totalLoaded = 0,
                i, promise;
            for (i=0; i<len; i++){
                promise = promiseHash[i];
                totalLoaded += promise._loaded || 0;
            }
            returnPromise.callback({
                total: size,
                loaded: totalLoaded,
                target: returnPromise
            });
        };

        // send a notification to `progressfn` whenever a chunk finishes
        notifyResolved = function(promise, loaded) {
            promise.then(function() {
                promise._loaded = loaded;
                promise._notify();
            });
        };

        // sets the `right` xhr in the returned promise. That is: the server-response that holds the final data
        // and not the intermediate response.
        setXHR = function(xhr) {
            var responseText = xhr.responseText,
                response;
            try {
                response = JSON.parse(responseText); // no reviver, we are only interested in the `status` property
            }
            catch(err) {
                response = {};
                console.warn(err);
            }
            response.status && (response.status=response.status.toLowerCase());
            if (response.status!=='busy') {
                if (options.parseJSONDate) {
                    try {
                        responseObject = JSON.parse(responseText, REVIVER);
                    }
                    catch(err) {
                        console.warn(err);
                        responseObject = {};
                    }
                }
                else {
                    responseObject = response;
                }
            }
        };

        options = Object.isObject(options) ? options.deepClone() : {};
        options.timeout || (options.timeout=DEFAULT_TIMEOUT);
        returnPromise = Promise.manage(options.progressfn);

        filename = blob.name;
        size = blob.size;
        if (options.progressfn) {
            // immediately start with processing 0%
            returnPromise.callback({
                total: size,
                loaded: 0,
                target: returnPromise
            });
        }

        instance._getClientId(url).then(function(clientId) {
            options.url = url;
            options.method || (options.method='PUT');
            options.url = url;
            options.data = blob;
            // delete hidden property `responseType`: don't want accedentially to be used
            delete options.responseType;

            // Important: headers need to be deepCloned, otherwise all chuncks share the same headers
            // and we dwant the last chunk to have different headers!
            headers = options.headers ? options.headers.deepClone() : {};
            // options.headers[CONTENT_TYPE] = blob.type || MIME_BLOB;
            headers['X-TransId'] = idGenerator(GENERATOR_ID);
            headers['X-ClientId'] = clientId;
            headers['X-Total-size'] = size;
            headers[CONTENT_TYPE] = MIME_BLOB;

            if (size<=MB_1) {
                chunkSize = KB_25;
            }
            else if (size<=MB_20) {
                chunkSize = KB_100;
            }
            else {
                chunkSize = KB_256;
            }
            end = chunkSize;
            partialSize = chunkSize;
            while (start < size) {
                //push the fragments to an array
                options.data = blob.slice(start, end);

                start = end;
                end = start + chunkSize;
                headers['X-Partial']= ++i;
                options.headers = headers.deepClone();
                if (start>=size) {
                    // set the filename on the last request:
                    options.headers['X-Filename'] = filename || 'blob';
                    Object.isObject(params) && (options.headers['x-data']=JSON.stringify(params));
                    partialSize = (size % chunkSize) || chunkSize;
                }
                //upload the fragment to the server:
                ioPromise = instance.request(options);
                if (options.progressfn) {
                    ioPromise._notify = notify;
                    notifyResolved(ioPromise, partialSize);
                }
                promiseHash.push(ioPromise); // needed to be able to call `abort`
                // we need to inspect the response for status==='busy' to know which promise holds the final
                // value and should be used as the returnvalue. Therefore, create `hashPromise`
                hashPromise = ioPromise.then(setXHR);
                ioHash.push(hashPromise);
            }

            Promise.all(ioHash).then(
                function() {
                    returnPromise.fulfill(responseObject);
                },
                function(e) {
                    returnPromise.reject(e);
                }
            );
        });

        // set `abort` to the thennable-promise:
        returnPromise.abort = function() {
            promiseHash.forEach(function(partialIO) {
                partialIO.abort();
            });
            returnPromise.reject(new Error(ABORTED));
        };
        // send a message to ITSA's the Message's system so that any statusbar can show a spinner - if it wants to:
        message = messages.message(MESSAGES.send, {level: 4, icon: SPINNER_ICON, stayActive: MIN_SHOWUP});
        returnPromise.finally(function() {
            message.fulfill();
        });
        return returnPromise;
    };

    IO._xhrList.push(_entendXHR);
    IO._xhrInitList.push(_progressHandle);

    return IO;
};