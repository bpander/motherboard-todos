define(function (require) {
    'use strict';

    var M = require('motherboard');
    var State = require('state');


    return M.extend('nav', 'm-nav', function (proto, base) {

        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = new State(this.findAllWithTag('m-nav.state'), {
                selected: 'selected',
                page: ''
            });

        };

    });
});
