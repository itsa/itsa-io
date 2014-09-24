/*global describe, it */

(function (window) {

"use strict";

var expect = require('chai').expect,
    should = require('chai').should();

var IO = require("../io")(window),
    IO_STREAM = require("../io-stream.js")(window),
    URL = 'http://servercors.itsa.io/io',
    ieTest = window.navigator.userAgent.match(/MSIE (\d+)\./),
    ie = ieTest && ieTest[1],
    block2k = '',
    xdr = ie && (ie<10),
    i;

    IO_STREAM.mergeInto(IO);

    // we might need cors to make the tests pass in travis
    xdr && require("../io-cors-ie9.js")(window).mergeInto(IO);

    // Very interesting issue where we must take care with:
    // XDomainRequest only fires the `onprogress`-event when the block of code exceeds 2k !
    // see: http://blogs.msdn.com/b/ieinternals/archive/2010/04/06/comet-streaming-in-internet-explorer-with-xmlhttprequest-and-xdomainrequest.aspx
    // Thus, we prepend the response with 2k of whitespace
    for (i=0; i<2000; i++) {
        block2k += ' ';
    }

    describe('io-stream', function () {

        it('get', function (done) {
            this.timeout(5000);
            var options, cb, pck = 0;
            cb = function(data) {
                pck++;
                expect(data).to.eql(block2k+'package '+pck);
            };
            options = {
                url: URL+'/action/stream',
                method: 'GET',
                streamback: cb
            };

            IO.request(options).then(
                function(xhr) {
                    expect(pck).to.eql(4);
                    xhr.responseText.should.be.eql(block2k+'package 1'+block2k+'package 2'+block2k+'package 3'+block2k+'package 4');
                    done();
                }
            )
            .then(
                undefined,
                done
            );

        });

    });

}(global.window || require('node-win')));