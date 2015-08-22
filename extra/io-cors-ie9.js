
"use strict";

/**
 * Extends io by enabling `CORS` through XDR on IE<10.
 *
 * @example
 * var IO = require("io/extra/io-cors.js")(window);
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module io
 * @submodule io-cors
 * @class IO
 * @since 0.0.1
*/

require('js-ext/lib/object.js');

var NAME = '[io-cors-ie9]: ',
    createHashMap = require('js-ext/extra/hashmap.js').createMap,
    XmlDOMParser = require('xmldom').DOMParser,
    UNKNOW_ERROR = 'Unknown XDR-error', // XDR doesn't specify the error
    REGEXP_EXTRACT_URL = new RegExp("^((([a-z][a-z0-9-.]*):\/\/)?(([^\/?#:]+)(:(\\d+))?)?)?(\/?[a-z0-9-._~%!$&'()*+,;=@]+(\/[a-z0-9-._~%!$&'()*+,;=:@]+)*\/?|\/)?([#?](.*)|$)", "i"),
    currentDomain,
    BODY_METHODS = createHashMap({
        POST: 1,
        PUT: 1
    }),
    VALID_XDR_METHODS = createHashMap({
        GET: 1,
        POST: 1
    });


module.exports = function (window) {

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());

    if (window._ITSAmodules.IO_Cors) {
        return window._ITSAmodules.IO_Cors; // IO_Cors was already created
    }

    var IO = require('../io.js')(window),

    isCrossDomain = function (url) {
        var domain;
        if (window.navigator.userAgent==='fake') {
            return false;
        }
        domain = url.match(REGEXP_EXTRACT_URL)[1]; // will be undefined for relative url's
        // in case of absoulte url: make it lowercase:
        domain && (domain.toLowerCase());
        // get the browserdomain:
        currentDomain || (currentDomain=window.location.href.match(REGEXP_EXTRACT_URL)[1].toLowerCase());
        // crossdomain will only be true with absolute url's which differ from browser domain:
        return domain && (currentDomain !== domain);
    },

    entendXHR = function(xhr, props, options /*, promise */) {
        var crossDomain;
        if (!props._isXHR2) {
            crossDomain = isCrossDomain(options.url);
            if (crossDomain && !props._isXDR) {
                if (typeof window.XDomainRequest !== 'undefined') {
                    xhr = new window.XDomainRequest();
                    props._isXDR = true;
                }
            }
            props._CORS_IE = crossDomain && props._isXDR;
        }
        props._CORS_IE && !VALID_XDR_METHODS[options.method] && (options.method=(BODY_METHODS[options.method] ? 'POST' : 'GET'));

    // TODO: check how to deal with opera-mini

        return xhr;
    },

    readyHandleXDR = function(xhr, promise, headers /*, method */) {
        if (xhr._isXDR) {
            console.log(NAME, 'readyHandleXDR');
            // for XDomainRequest, we need 'onload' instead of 'onreadystatechange'
            xhr.onload || (xhr.onload=function() {
                var responseText = xhr.responseText,
                    xmlRequest = headers && (headers.Accept==='text/xml'),
                    responseobject;
                clearTimeout(xhr._timer);
                console.log(NAME, 'xhr.onload invokes with responseText='+responseText);
                // to remain consisten with XHR, we define an object with the same structure
                responseobject = {
                    _contenttype: xhr.contentType,
                    responseText: responseText,
                    responseXML: xmlRequest ? new XmlDOMParser().parseFromString(responseText) : null,
                    readyState: 4,
                    status: 200, // XDomainRequest returns only OK or Error
                    // XDomainRequest only returns the header Content-Type:
                    getAllResponseHeaders: function () {
                        return 'Content-Type: '+this._contenttype;
                    },
                    getResponseHeader: function (name) {
                        if (name==='Content-Type') {
                            return this._contenttype;
                        }
                    }
                };
                promise.fulfill(responseobject);
            });
            xhr.onerror || (xhr.onerror=function() {
                clearTimeout(xhr._timer);
                promise.reject(UNKNOW_ERROR);
            });
        }
    };

    IO._xhrList.push(entendXHR);
    IO._xhrInitList.push(readyHandleXDR);

    window._ITSAmodules.IO_Cors = IO;

    return IO;
};
