define(function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.define('x-stateful-element', function (proto, base) {


        proto.setState = function (state) {
            console.log(state);
        };


    });
});
