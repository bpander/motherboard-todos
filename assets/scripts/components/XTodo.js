define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var XStatefulElement = require('components/XStatefulElement');


    return XElement.extend(XStatefulElement, 'x-todo', function (proto, base) {


        proto.EVENT = {
            STATUS_CHANGE: 'complete',
            TEXT_CHANGE: 'textchange',
            REMOVE: 'remove'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                complete: false,
                text: ''
            };

            this.checkbox = this.findWithTag('x-todo.checkbox');

            this.editField = this.findWithTag('x-todo.editField');

            this.label = this.findWithTag('x-todo.label');

            this.createBinding(this.checkbox, 'change', proto.handleCheckboxChange);
            this.createBinding(this.label, 'dblclick', proto.handleLabelDblClick);
            this.createBinding(this.editField, 'keyup', proto.handleEditFieldBlur);
            this.createBinding(this.editField, 'blur', proto.handleEditFieldBlur)
            this.createBinding(this.findWithTag('x-todo.removalButton'), 'click', proto.handleRemovalButtonClick);
            this.enable();
        };


        proto.handleCheckboxChange = function (e) {
            this.trigger(this.EVENT.STATUS_CHANGE, { complete: e.target.checked });
        };


        proto.handleRemovalButtonClick = function () {
            this.trigger(this.EVENT.REMOVE);
        };


        proto.handleLabelDblClick = function () {
            this.element.classList.add(this.options.editingClass);
            this.editField.value = this.label.textContent;
            this.editField.select();
        };


        proto.handleEditFieldBlur = function (e) {
            if (e.type === 'keyup' && e.keyCode !== 13) {
                return;
            }
            this.element.classList.remove(this.options.editingClass);
            this.label.textContent = this.editField.value;
            this.trigger(this.EVENT.TEXT_CHANGE, { text: this.editField.value });
        };


    });
});
