/*global describe, it */

(function (window) {

    "use strict";

    var expect = require('chai').expect,
    	should = require('chai').should();
    require('extend-js');

    var IO = require("../io")(window),
        URL = 'http://servercors.itsa.io/io/status',
        ieTest = window.navigator.userAgent.match(/MSIE (\d+)\./),
        ie = ieTest && ieTest[1],
        xdr = ie && (ie<10),
        checklist = {
            200: true,
            201: true,
            202: true,
            203: true,
            204: false, // this response doesn't return on IE<10
            205: true,
            206: true,
            300: true,
            301: true,
            302: false, // this request doesn't run on node-XMLHttpRequest, for url is made undefined (?)
            303: false, // this request doesn't run on node-XMLHttpRequest, for url is made undefined (?)
            304: false, // this response doesn't return on IE<10
            305: true,
            306: true,
            307: false, // this request doesn't run on node-XMLHttpRequest, for url is made undefined (?)
            400: true,
            401: true,
            402: true,
            403: true,
            404: true,
            405: true,
            406: true,
            407: true,
            408: true,
            409: true,
            410: true,
            411: true,
            412: true,
            413: true,
            414: true,
            415: true,
            416: true,
            417: true,
            500: true,
            501: true,
            502: true,
            503: true,
            504: true,
            505: true
        };

    // we might need cors to make the tests pass in travis
    xdr && require("../io-cors-ie9.js")(window).mergeInto(IO);

    describe('Status codes', function () {

        it('response 200-series', function (done) {
            var options = {
                    url: URL,
                    method: 'GET',
                    data: {res: 101}
                },
                a = [],
                res, createIO;
            createIO = function(res) {
                var requestRes = res;
                options.data.res = requestRes;
                return IO.request(options).then(
                    function(response) {
                        var resString = requestRes.toString(),
                            responseText = response.responseText;
                        // 204 and 205 seem to be a responses without content
                        if (requestRes===204) {
                            responseText.should.be.eql('');
                        }
                        else if (requestRes===205) {
                            ((responseText==='') || (responseText===resString)).should.be.true;
                        }
                        else {
                            responseText.should.be.eql(((requestRes===204) || (requestRes===205)) ? '' : resString);
                        }
                    }
                );
            }

            for (res=200; res<=206; res++) {
                checklist[res] && a.push(createIO(res));
            }

            Promise.all(a).then(
                function() {
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });

        it('response 300-series', function (done) {
            var options = {
                    url: URL,
                    method: 'GET',
                    data: {res: 101}
                },
                a = [],
                res, createIO;
            createIO = function(res) {
                var requestRes = res;
                options.data.res = requestRes;
                return IO.request(options).then(
                    function(response) {
                        throw new Error('_xhr should not resolve');
                    },
                    function(error) {
                        return true;
                    }
                );
            }

            for (res=300; res<=307; res++) {
                checklist[res] && a.push(createIO(res));
            }

            Promise.all(a).then(
                function() {
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });

        it('response 400-series', function (done) {
            var options = {
                    url: URL,
                    method: 'GET',
                    data: {res: 101}
                },
                a = [],
                res, createIO;
            createIO = function(res) {
                var requestRes = res;
                options.data.res = requestRes;
                return IO.request(options).then(
                    function(response) {
                        throw new Error('_xhr should not resolve');
                    },
                    function(error) {
                        return true;
                    }
                );
            }

            for (res=400; res<=417; res++) {
                checklist[res] && a.push(createIO(res));
            }

            Promise.all(a).then(
                function() {
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });

        it('response 500-series', function (done) {
            var options = {
                    url: URL,
                    method: 'GET',
                    data: {res: 101}
                },
                a = [],
                res, createIO;
            createIO = function(res) {
                var requestRes = res;
                options.data.res = requestRes;
                return IO.request(options).then(
                    function(response) {
                        throw new Error('_xhr should not resolve');
                    },
                    function(error) {
                        return true;
                    }
                );
            }

            for (res=500; res<=505; res++) {
                checklist[res] && a.push(createIO(res));
            }

            Promise.all(a).then(
                function() {
                    done();
                },
                function(err) {
                    done(err);
                }
            );
        });

    });

}(global.window || require('node-win')));