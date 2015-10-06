(function (global) {
    "use strict";

    var IO = require('./io.js')(global);
    require('./extra/io-transfer.js')(global);
    require('./extra/io-stream.js')(global);
    require('./extra/io-filetransfer.js')(global);

    module.exports = IO;

}(typeof global !== 'undefined' ? global : /* istanbul ignore next */ this));
