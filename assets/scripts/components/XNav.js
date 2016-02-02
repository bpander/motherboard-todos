define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var XStatefulElement = require('components/XStatefulElement');


    return XElement.extend(XStatefulElement, 'x-nav', function (proto, base) {

        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                selected: 'selected',
                page: ''
            };

        };

    });
});
