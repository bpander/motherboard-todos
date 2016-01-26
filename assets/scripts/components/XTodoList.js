define(function (require) {
    'use strict';


    return require('xelement').extend('section', 'x-todo-list', function (proto, base) {

        var XForm = require('components/XForm');
        var XTodo = require('components/XTodo');
        var XList = require('components/XList');
        var TodoRepository = require('repositories/TodoRepository');


        var MODEL_ID_KEY = 'todosModelId';


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoTemplate = this.findWithTag('x-todo-list.todoTemplate');

            this.checkAllBox = this.findWithTag('TodosDispatcher:checkAllBox');

            this.remainingCount = this.findWithTag('TodosDispatcher:remainingCount');

            this.clearCompletedButton = this.findWithTag('TodosDispatcher:clearCompletedButton');

            this.footer = this.findWithTag('TodosDispatcher:footer');

            this.xform = this.getComponent(XForm, 'x-todo-list.xform');

            this.xlist = this.getComponent(XList, 'x-todo-list.xlist');

            this.todoRepository = new TodoRepository();

            this.createBinding(this.xform, this.xform.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.createBinding(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.enable();

            this.todoRepository.fetch().forEach(todo => this.add(todo));
            this.updateUI();
        };


        // TODO: This should take an array of models and should call the filter fn on it (in case of adding an item while the filter is set to "completed")
        // TODO: Whever this takes, .remove should also take (either both take models or both take elements)
        proto.add = function (todoModel) {
            var docFrag = document.importNode(this.todoTemplate.content, true);
            var xtodo = docFrag.querySelector(XTodo.prototype.selector);
            xtodo.setState(todoModel.data);
            xtodo.dataset[MODEL_ID_KEY] = todoModel.guid;
            this.xlist.add(xtodo);

            // TODO: Move these to .createdCallback because the events can be delegated
            this.createBinding(xtodo, xtodo.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange).enable();
            this.createBinding(xtodo, xtodo.EVENT.TEXT_CHANGE, proto.handleTodoTextChange).enable();
            this.createBinding(xtodo, xtodo.EVENT.REMOVE, proto.handleTodoRemove).enable();
        };


        proto.remove = function (todoComponents) {
            todoComponents.forEach(function (xtodo) {
                var id = xtodo.dataset[MODEL_ID_KEY];
                this.todoRepository.delete(id);
                this.xlist.remove(xtodo);
            }, this);
        };


        proto.toggleComplete = function (todoComponents, isComplete) {
            todoComponents.forEach(function (todoComponent) {
                var guid = todoComponent.dataset[MODEL_ID_KEY];
                this.todoRepository.update(guid, { complete: isComplete });
                todoComponent.checkbox.checked = isComplete;
            }, this);
        };


        proto.updateUI = function () {
            // var todoComponents = this.getComponents(XTodo);
            // if (todoComponents.length <= 0) {
            //     this.footer.style.display = 'none';
            //     this.checkAllBox.style.display = 'none';
            //     return;
            // }
            // var completedCount = todoComponents.filter(c => c.checkbox.checked).length;
            // var remainingCount = todoComponents.length - completedCount;
            // var areAllComplete = remainingCount <= 0;

            // this.footer.style.display = '';
            // this.checkAllBox.style.display = '';
            // this.checkAllBox.checked = areAllComplete;

            // this.remainingCount.innerHTML = remainingCount;
            // this.clearCompletedButton.disabled = completedCount <= 0;
        };


        proto.handleSubmit = function (e) {
            var todoModel = this.todoRepository.create(e.detail.request);
            this.add(todoModel);
            this.xform.reset();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            this.toggleComplete([ e.target ], e.detail.complete);
            this.updateUI();
        };


        proto.handleTodoTextChange = function (e) {
            var guid = e.target.dataset[MODEL_ID_KEY];
            this.todoRepository.update(guid, { text: e.detail.text });
        };


        proto.handleTodoRemove = function (e) {
            // TODO: the repository remove call should go here (to mirror .add)
            this.remove([ e.target ]);
            this.updateUI();
        };


        proto.handleCheckAllChange = function (e) {
            this.toggleComplete(this.getComponents(XTodo), e.target.checked);
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var completed = this.getComponents(XTodo).filter(c => c.checkbox.checked);
            this.remove(completed);
            this.updateUI();
        };

    });
});
