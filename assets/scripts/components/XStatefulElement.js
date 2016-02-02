define(function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.define('x-stateful-element', function (proto, base) {


        var VAR_NAME = 'state';

        /**
         * This essentially works the same way as doT.js's compilation except without any logic tags and it returns an object instead of a string.
         *
         * @private
         * @static
         * @param  {String} templateString  A string to be evaluated (note: not eval'd) with a `state` context, e.g. `'{ textContent: state.text }'`.
         * @return {Function}  A template function
         */
        var _compileObjectTemplate = function (templateString) {
            return new Function(VAR_NAME, 'return ' + templateString + ';');
        };


        proto.customAttributes = [

            XElement.attribute('props-attr', {
                type: String,
                default: 'data-props'
            })

        ];


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.pieces = Array.prototype.map.call(this.querySelectorAll('[' + this.propsAttr + ']') || [], function (element) {
                return {
                    element: element,
                    template: _compileObjectTemplate(element.getAttribute(this.propsAttr))
                };
            }, this);

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
            Object.assign(this.state, state);
            // TODO: Make this work on nested properties like element.style
            for (i = 0, l = this.pieces.length; i < l; i++) {
                piece = this.pieces[i];
                props = piece.template(this.state);
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
        };


    });
});
