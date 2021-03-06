/*global describe, it */
/*jshint unused:false */

(function (window) {

    "use strict";

    var chai = require('chai'),
        expect = chai.expect,
        should = chai.should();

    chai.use(require('chai-as-promised'));

    var IO = require("../extra/io-xml.js")(window),
        URL = 'http://servercors.itsa.io/io',
        ieTest = window.navigator.userAgent.match(/MSIE (\d+)\./),
        ie = ieTest && ieTest[1],
        xdr = ie && (ie<10);

    // we might need cors to make the tests pass in travis
    xdr && require("../extra/io-cors-ie9.js")(window);

    describe('io.readXML()', function () {

        this.timeout(5000);

        it('xml response', function (done) {
            IO.readXML(URL+'/action/responsexml').then(
                function(responseXML) {
                    responseXML.getElementsByTagName('response')[0].firstChild.nodeValue.should.be.eql('10');
                    done();
                },
                done
            );
        });

        it('non text/xml response', function (done) {
            IO.readXML(URL+'/action/responsetxt').then(
                function() {
                    done(new Error('readXML should not resolve when responsetype is not text/xml'));
                },
                function(error) {
                    error.message.should.be.eql('recieved Content-Type is no XML');
                    done();
                }
            );
        });

        it('aborted', function () {
            var io = IO.readXML(URL+'/action/responsedelayed');

            io.should.be.rejected;
            setTimeout(function() {
                io.abort();
            }, 250);
        });

    });

}(global.window || require('node-win')));
