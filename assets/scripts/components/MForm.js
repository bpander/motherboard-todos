define(function (require) {
    'use strict';

    var M = require('motherboard');
    var formSerialize = require('form-serialize');


    return M.extend('form', 'm-form', function (proto, base) {


        proto.EVENT = {
            CUSTOM_SUBMIT: 'm-form.customsubmit'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);
            this.listen(this, 'submit', proto.handleSubmit);
            this.enable();
        };


        proto.handleSubmit = function (e) {
            e.preventDefault();
            var i = this.elements.length;
            var element;
            var isValid = true;
            while ((element = this.elements[--i]) !== undefined) {
                if (element.checkValidity() === false) {
                    isValid = false;
                }
            }
            if (isValid) {
                this.trigger(this.EVENT.CUSTOM_SUBMIT, {
                    request: formSerialize(this, { hash: true })
                });
            }
        };


    });
});