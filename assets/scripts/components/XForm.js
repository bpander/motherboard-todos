define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var formToObject = require('../../../bower_components/formToObject.js/dist/formToObject');


    return XElement.extend('form', 'x-form', function (proto, base) {


        proto.EVENT = {
            CUSTOM_SUBMIT: 'x-form.customsubmit'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);
            this.createBinding(this, 'submit', proto.handleSubmit);
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
                    request: formToObject(this)
                });
            }
        };


    });
});