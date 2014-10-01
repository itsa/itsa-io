/*global describe, it */

(function (window) {

"use strict";

var expect = require('chai').expect,
    should = require('chai').should();

var IO = require("../io-stream.js")(window),
    URL = 'http://servercors.itsa.io/io',
    ieTest = window.navigator.userAgent.match(/MSIE (\d+)\./),
    ie = ieTest && ieTest[1],
    block2k = '',
    xdr = ie && (ie<10),
    i;

    require("../io-transfer.js")(window);
    require("../io-xml.js")(window);
    // we might need cors to make the tests pass in travis
    xdr && require("../io-cors-ie9.js")(window);

    // Very interesting issue where we must take care with:
    // XDomainRequest only fires the `onprogress`-event when the block of code exceeds 2k !
    // see: http://blogs.msdn.com/b/ieinternals/archive/2010/04/06/comet-streaming-in-internet-explorer-with-xmlhttprequest-and-xdomainrequest.aspx
    // Thus, we prepend the response with 2k of whitespace
    if (xdr) {
        for (i=0; i<2000; i++) {
            block2k += ' ';
        }
    }

    describe('io-stream', function () {

        it('IO.request with stream', function (done) {
            this.timeout(10000);
            var options, cb, pck = 0;
            cb = function(data) {
                pck++;
                expect(data).to.eql(block2k+'package '+pck);
            };
            options = {
                url: URL+'/action/stream',
                method: 'GET',
                streamback: cb,
                data: {xdr: xdr}
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

        it('IO.read with stream', function (done) {
            this.timeout(10000);
            var options, cb, pck = 0;
            cb = function(data) {
                pck++;
                expect(data).to.eql([{a: pck}]);
            };
            options = {
                streamback: cb
            };

            IO.read(URL+'/action/stream', {xdr: xdr, type: 'json'}, options).then(
                function(data) {
                    expect(pck).to.eql(4);
                    data.should.be.eql([{a:1},{a:2},{a:3},{a:4}]);
                    done();
                }
            )
            .then(
                undefined,
                done
            );
        });

        it('IO.readXML with stream', function (done) {
            this.timeout(10000);
            var options, cb, pck = 0;
            cb = function(responseXML) {
                pck++;
                responseXML.documentElement.getElementsByTagName('response')[0].firstChild.nodeValue.should.be.eql(pck.toString());
                expect(responseXML.documentElement.getElementsByTagName('response').length).to.be.eql(1);
            };
            options = {
                streamback: cb
            };

            IO.readXML(URL+'/action/stream', {xdr: xdr, type: 'xml'}, options).then(
                function(responseXML) {
                    expect(pck).to.eql(4);
                    responseXML.documentElement.getElementsByTagName('response')[2].firstChild.nodeValue.should.be.eql('3');
                    expect(responseXML.documentElement.getElementsByTagName('response').length).to.be.eql(4);
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