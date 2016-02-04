define(function (require) {
    'use strict';

    var M = require('motherboard');
    var MStatefulElement = require('components/MStatefulElement');


    return M.extend(MStatefulElement, 'm-nav', function (proto, base) {

        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                selected: 'selected',
                page: ''
            };

        };

    });
});
