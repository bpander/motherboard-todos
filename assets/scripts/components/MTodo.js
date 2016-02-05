define(function (require) {
    'use strict';

    var M = require('motherboard');
    var State = require('state');


    return M.element('m-todo', function (proto, base) {


        proto.customAttributes = [

            M.attribute('editing-class', {
                type: String,
                default: 'editing'
            })

        ];


        proto.EVENT = {
            STATUS_CHANGE: 'm-todo.complete',
            TEXT_CHANGE: 'm-todo.textchange',
            REMOVE: 'm-todo.remove'
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.checkbox = this.findWithTag('m-todo.checkbox');

            this.editField = this.findWithTag('m-todo.editField');

            this.label = this.findWithTag('m-todo.label');

            this.state = new State(
                this.findAllWithTag('m-todo.state').concat(this.label, this.checkbox),
                { complete: false, text: '' }
            );

            this.blurListener = this.listen(this.editField, 'blur', proto.handleEditFieldBlur);
            this.listen(this.editField, 'keyup', proto.handleEditFieldBlur);
            this.listen(this.checkbox, 'change', proto.handleCheckboxChange);
            this.listen(this.label, 'dblclick', proto.handleLabelDblClick);
            this.listen(this.findWithTag('m-todo.removalButton'), 'click', proto.handleRemovalButtonClick);
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
                    this.blurListener.disable();
                    this.parentElement.classList.remove(this.editingClass);
                    setTimeout(function () {
                        this.blurListener.enable();
                    }.bind(this), 10);
                    return;
                }
                if (e.keyCode !== 13) {
                    return;
                }
            }
            if (this.editField.value.trim() === '') {
                this.blurListener.disable(); // Similar issue stated above
                this.trigger(this.EVENT.REMOVE);
                return;
            }
            this.parentElement.classList.remove(this.editingClass);
            this.label.textContent = this.editField.value;
            this.trigger(this.EVENT.TEXT_CHANGE, { text: this.editField.value });
        };


    });
});
