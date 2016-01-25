define(function (require) {
    'use strict';


    return require('xelement').extend('section', 'x-todo-list', function (proto, base) {

        var XForm = require('components/XForm');
        var XTodo = require('components/XTodo');
        var TodoRepository = require('repositories/TodoRepository');


        var MODEL_ID_KEY = 'todosModelId';


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoList = this.findWithTag('TodosDispatcher:todoList');

            this.checkAllBox = this.findWithTag('TodosDispatcher:checkAllBox');

            this.remainingCount = this.findWithTag('TodosDispatcher:remainingCount');

            this.clearCompletedButton = this.findWithTag('TodosDispatcher:clearCompletedButton');

            this.footer = this.findWithTag('TodosDispatcher:footer');

            this.todoRepository = new TodoRepository();

            this.formComponent = this.getComponent(XForm);

            this.createBinding(this.formComponent, XForm.prototype.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.createBinding(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.enable();

            this.todoRepository.fetch().forEach(todo => this.add(todo));
            this.updateUI();
        };


        proto.add = function (todoModel) {
            var element = this.todoList.appendChild(document.createElement('li'));
            var xtodo = new XTodo();
            element.appendChild(xtodo);
            xtodo.render(todoModel.data);
            xtodo.dataset[MODEL_ID_KEY] = todoModel.guid;
            this.createBinding(xtodo, xtodo.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange).enable();
            this.createBinding(xtodo, xtodo.EVENT.TEXT_CHANGE, proto.handleTodoTextChange).enable();
            this.createBinding(xtodo, xtodo.EVENT.REMOVE, proto.handleTodoRemove).enable();
        };


        proto.remove = function (todoComponents) {
            todoComponents.forEach(function (xtodo) {
                var id = xtodo.dataset[MODEL_ID_KEY];
                this.todoRepository.delete(id);
                xtodo.parentNode.removeChild(xtodo);
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
            this.formComponent.reset();
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
