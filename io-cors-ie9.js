
"use strict";

/**
 * Extends io by adding the method `readXML` to it.
 * Should be called using  the provided `mergeInto`-method like this:
 *
 * @example
 * var IO = require("io");
 * var IOcors = require("io-cors");
 * IOcors.mergeInto(IO);
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

var NAME = '[io-cors-ie9]: ',
    XmlDOMParser = require('xmldom').DOMParser,
    UNKNOW_ERROR = 'Unknown XDR-error', // XDR doesn't specify the error
    REQUEST_TIMEOUT = 'Request-timeout',
    REGEXP_EXTRACT_URL = new RegExp("^((([a-z][a-z0-9-.]*):\/\/)?(([^\/?#:]+)(:(\\d+))?)?)?(\/?[a-z0-9-._~%!$&'()*+,;=@]+(\/[a-z0-9-._~%!$&'()*+,;=:@]+)*\/?|\/)?([#?](.*)|$)", "i"),
    currentDomain,
    BODY_METHODS = {
        POST: 1,
        PUT: 1
    },
    VALID_XDR_METHODS = {
        GET: 1,
        POST: 1
    };

module.exports = function (window) {

    var isCrossDomain = function (url) {
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

    entendXHR = function(xhr, props, options) {
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

    readyHandleXDR = function(xhr, promise, headers, method) {
        if (xhr._isXDR) {
            console.log(NAME, 'readyHandleXDR');
            // for XDomainRequest, we need 'onload' instead of 'onreadystatechange'
            xhr.onload || (xhr.onload=function() {
                var responseText = xhr.responseText,
                    xmlRequest = headers && (headers.Accept==='text/xml');
                clearTimeout(xhr._timer);
                console.log(NAME, 'xhr.onload invokes with responseText='+responseText);
                // to remain consisten with XHR, we define an object with the same structure
                var responseobject = {
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
    },

    IO_CORS = {
        mergeInto: function (io) {
            io._xhrList.push(entendXHR);
            io._xhrInitList.push(readyHandleXDR);
        }
    };

    return IO_CORS;
};
