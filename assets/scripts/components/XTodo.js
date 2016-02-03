define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var XStatefulElement = require('components/XStatefulElement');


    return XElement.extend(XStatefulElement, 'x-todo', function (proto, base) {


        proto.customAttributes = [

            XElement.attribute('editing-class', {
                type: String,
                default: 'editing'
            })

        ];


        proto.EVENT = {
            STATUS_CHANGE: 'x-todo.complete',
            TEXT_CHANGE: 'x-todo.textchange',
            REMOVE: 'x-todo.remove'
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

            this.blurBinding = this.createBinding(this.editField, 'blur', proto.handleEditFieldBlur);
            this.createBinding(this.editField, 'keyup', proto.handleEditFieldBlur);
            this.createBinding(this.checkbox, 'change', proto.handleCheckboxChange);
            this.createBinding(this.label, 'dblclick', proto.handleLabelDblClick);
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
            this.parentElement.classList.add(this.editingClass);
            // Normally you would never use parentElement this way but it's necessary to work with the (not really exemplary) todomvc css (e.g. `.todo-list li.editing .view`)
            this.editField.value = this.label.textContent;
            this.editField.select();
        };


        proto.handleEditFieldBlur = function (e) {
            if (e.type === 'keyup') {
                if (e.keyCode === 27) {
                    // Escaping will trigger a 'blur' (because the input is getting hid),
                    // and we don't want that to trigger the normal 'blur' behavior (saving).
                    // This is a quick and dirty way to temporarily disable normal 'blur' behavior
                    this.blurBinding.disable();
                    this.parentElement.classList.remove(this.editingClass);
                    setTimeout(function () {
                        this.blurBinding.enable();
                    }.bind(this), 10);
                    return;
                }
                if (e.keyCode !== 13) {
                    return;
                }
            }
            this.parentElement.classList.remove(this.editingClass);
            this.label.textContent = this.editField.value;
            this.trigger(this.EVENT.TEXT_CHANGE, { text: this.editField.value });
        };


    });
});
