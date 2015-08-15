"use strict";

require('js-ext/lib/object.js');
require('js-ext/lib/promise.js');

var NAME = '[io-filetransfer]: ',
    GENERATOR_ID = 'ITSA-FILETRANS',
    MIME_BLOB = 'application/octet-stream',
    CONTENT_TYPE = 'Content-Type',
    createHashMap = require('js-ext/extra/hashmap.js').createMap,
    idGenerator = require('utils').idGenerator,
    SPINNER_ICON = 'spinnercircle-anim',
    MIN_SHOWUP = 500,
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

    var IO = require('../io.js')(window);

    window._ITSAmodules.IO_Filetransfer = IO;

    IO._getClientId = function(url) {
        var options;
        if (IO._clientId) {
            return Promise.resolve(IO._clientId);
        }
        options = {
            url: url,
            method: 'GET',
            data: {
                ts: Date.now() // prevent caching
            }
        };
        return this.request(options).then(function(xhrResponse) {
            IO._clientId = xhrResponse.responseText;
            return IO._clientId;
        }).catch(function(err) {
            console.warn(err);
        });
    };

    /**
     * Performs an AJAX PUT request.
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
     * @param [params] {Object} additional parameters. NOTE: these will be set as HEADERS like `X-Data-parameter` on the request!
     *        should be a plain object with only primitive types which are transformed into key/value pairs.
     * @param [options] {Object}
     *    @param [options.sync=false] {boolean} By default, all requests are sent asynchronously. To send synchronous requests, set to true.
     *    @param [options.headers] {Object} HTTP request headers.
     *    @param [options.timeout=60000] {Number} to timeout the request, leading into a rejected Promise.
     *    @param [options.withCredentials=false] {boolean} Whether or not to send credentials on the request.
     * @return {Promise}
     * on success:
        * xhr {XMLHttpRequest|XDomainRequest} xhr-response
     * on failure an Error object
        * reason {Error}
    */
    IO.sendBlob = function (url, blob, params, options) {
        console.log(NAME, 'get --> '+url);
        var instance = this,
            start = 0,
            ioHash = [],
            i = 0,
            totalLoaded = 0,
            chunkSize, end, size, returnPromise, message, filename,
            ioPromise, partialSize, notifyResolved;
        if (!IO.supportXHR2) {
            return Promise.reject('This browser does not support fileupload');
        }
        if (!blob instanceof window.Blob) {
            return Promise.reject('No proper fileobject');
        }

        notifyResolved = function(promise, loaded) {
            promise.then(function() {
                totalLoaded += loaded;
                returnPromise.callback({
                    total: size,
                    loaded: totalLoaded
                });
            });
        };

        options || (options={});
        returnPromise = Promise.manage(options.streamback);

        instance._getClientId(url).then(function(clientId) {
            filename = blob.name;
            size = blob.size;

            options.headers || (options.headers={});
            if (typeof params==='object') {
                params.each(function(value, key) {
                    options.headers['X-Data-'+key] = String(value);
                });
            }
            options.url = url;
            options.method || (options.method='PUT');
            // options.headers[CONTENT_TYPE] = blob.type || MIME_BLOB;
            options.headers['X-TransId'] = idGenerator(GENERATOR_ID);
            options.headers['X-ClientId'] = clientId;
            options.headers[CONTENT_TYPE] = MIME_BLOB;
            options.url = url;
            options.data = blob;
            // delete hidden property `responseType`: don't want accedentially to be used
            delete options.responseType;

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
                options.headers['X-Partial']= ++i;
                if (start>=size) {
                    // set the filename on the last request:
                    options.headers['X-Filename'] = filename;
                    partialSize = (size % chunkSize) || chunkSize;
                }
    //upload the fragment to the server
                ioPromise = instance.request(options);
                options.streamback && notifyResolved(ioPromise, partialSize);
                ioHash.push(ioPromise);
            }

            Promise.all(ioHash).then(function() {
                returnPromise.fulfill({status: 'OK'});
            });
        });

        // set `abort` to the thennable-promise:
        returnPromise.abort = function() {
            ioHash.forEach(function(partialIO) {
                partialIO.abort();
            });
            returnPromise.reject(new Error(ABORTED));
        };
        message = messages.message(MESSAGES.send, {level: 4, icon: SPINNER_ICON, stayActive: MIN_SHOWUP});
        returnPromise.finally(function() {
            message.fulfill();
        });
        return returnPromise;
    };

    /**
    * Determines the number of transitionend-events there will occur
    * @method _getEvtTransEndCount
    * @private
    * @since 0.0.1
    */
    window.HTMLInputElement.prototype.sendFiles = function(url, params, options) {
        var instance = this,
            files = instance.files,
            len = files.length,
            hash = [],
            promise, file, i;
        if (len>0) {
            // files is array-like, no true array
            for (i=0; i<len; i++) {
                file = files[i];
                hash.push(IO.sendBlob(url, file, params, options));
            }
            promise = window.Promise.finishAll(hash);
            promise.abort = function() {
                hash.forEach(function(ioPromise) {
                    ioPromise.abort();
                });
            };
            return promise;
        }
        else {
            return window.Promise.reject('No files selected');
        }
    };

    return IO;
};