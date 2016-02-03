define(function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.extend('ul', 'x-list', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.elements = [];

        };


        proto.add = function (element) {
            var li = document.createElement('li');
            li.appendChild(element);
            this.appendChild(li);
            this.elements.push(element);
        };


        proto.remove = function (element) {
            var i = this.elements.indexOf(element);
            if (i === -1) {
                return;
            }
            this.removeChild(this.children[i]);
            this.elements.splice(i, 1);
        };


        proto.empty = function () {
            this.elements.splice(0, this.elements.length);
            this.innerHTML = '';
        };


    });
});
