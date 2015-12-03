(function (WINDOW) {
    'use strict';

    var IO = require('./io.js')(WINDOW);
    require('./extra/io-transfer.js')(WINDOW);
    require('./extra/io-stream.js')(WINDOW);
    require('./extra/io-filetransfer.js')(WINDOW);

    module.exports = IO;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ window));