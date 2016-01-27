define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var doT = require('../bower_components/doT/doT.js');


    return XElement.define('x-stateful-element', function (proto, base) {

        
        var _templateSettings = Object.assign({}, doT.templateSettings, {
            varname: 'state'
        });


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.pieces = Array.prototype.map.call(this.querySelectorAll('[data-props]') || [], function (element) {
                return {
                    element: element,
                    template: doT.template('{{ out=' + element.dataset.props + '; }}', _templateSettings)
                };
            });

            this.state = {};

        };


        proto.setState = function (state) {
            var piece;
            var prop;
            var props;
            var i;
            var l;
            var oldVal;
            var newVal;
            for (i = 0, l = this.pieces.length; i < l; i++) {
                piece = this.pieces[i];
                props = piece.template(state);
                for (prop in props) {
                    if (props.hasOwnProperty(prop)) {
                        oldVal = piece.element[prop];
                        newVal = props[prop];
                        if (oldVal !== newVal) {
                            piece.element[prop] = props[prop];
                        }
                    }
                }
            }
            Object.assign(this.state, state);
        };


    });
});
