define(function (require) {
    'use strict';

    var XElement = require('xelement');


    return XElement.define('x-todo', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.checkbox = null;

            this.editField = null;

            this.label = null;

        };


        proto.render = function () {
            this.disable();
            this.bindings = [];

            this.element.innerHTML = `
                <div class="view">
                    <input class="toggle" type="checkbox" ${ vm.complete ? 'checked' : '' } data-tag="TodoComponent:checkbox" />
                    <label data-tag="TodoComponent:label">${vm.text}</label>
                    <button class="destroy" data-tag="TodoComponent:removalButton"></button>
                </div>
                <input type="text" class="edit" data-tag="TodoComponent:editField" />
            `;

            this.checkbox = this.findWithTag('TodoComponent:checkbox');
            this.editField = this.findWithTag('TodoComponent:editField');
            this.label = this.findWithTag('TodoComponent:label');

            this.createBinding(this.checkbox, 'change', _handleCheckboxChange);
            this.createBinding(this.label, 'dblclick', _handleLabelDblClick);
            this.createBinding(this.editField, 'keyup', _handleEditFieldBlur);
            this.createBinding(this.editField, 'blur', _handleEditFieldBlur)
            this.createBinding(this.findWithTag('TodoComponent:removalButton'), 'click', _handleRemovalButtonClick);
            this.enable();
        };


    });
});
