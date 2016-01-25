define(function (require) {
    'use strict';


    return require('xelement').extend('section', 'x-todo-list', function (proto, base) {

        var XForm = require('components/XForm');
        var XTodo = require('components/XTodo');
        var TodoRepository = require('repositories/TodoRepository');


        var MODEL_ID_KEY = 'todosModelId';


        var _handleSubmit = function (e) {
            var todoModel = this.todoRepository.create(e.data.requestObject);
            this.add(todoModel);
            this.formComponent.element.reset();
            this.updateUI();
        };


        var _handleTodoStatusChange = function (e) {
            this.toggleComplete([ e.target ], e.data.complete);
            this.updateUI();
        };


        var _handleTodoTextChange = function (e) {
            var guid = e.target.element.dataset[MODEL_ID_KEY];
            this.todoRepository.update(guid, { text: e.data.text });
        };


        var _handleTodoRemove = function (e) {
            this.remove([ e.target ]);
            this.updateUI();
        };


        var _handleCheckAllChange = function (e) {
            this.toggleComplete(this.getComponents(XTodo), e.target.checked);
            this.updateUI();
        };


        var _handleClearCompletedClick = function () {
            var completed = this.getComponents(XTodo).filter(c => c.checkbox.checked);
            this.remove(completed);
            this.updateUI();
        };


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoList = this.findWithTag('TodosDispatcher:todoList');

            this.checkAllBox = this.findWithTag('TodosDispatcher:checkAllBox');

            this.remainingCount = this.findWithTag('TodosDispatcher:remainingCount');

            this.clearCompletedButton = this.findWithTag('TodosDispatcher:clearCompletedButton');

            this.footer = this.findWithTag('TodosDispatcher:footer');

            this.todoRepository = new TodoRepository();

            this.formComponent = this.getComponent(XForm);

            this.createBinding(this.formComponent, XForm.prototype.EVENT.CUSTOM_SUBMIT, _handleSubmit);
            this.createBinding(this.checkAllBox, 'change', _handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', _handleClearCompletedClick);
            this.enable();

            this.todoRepository.fetch().forEach(todo => this.add(todo));
            this.updateUI();
        };


        proto.add = function (todoModel) {
            var element = this.todoList.appendChild(document.createElement('li'));
            var component = Parser.create(XTodo, element, { option: true });
            component.render(todoModel.data);
            element.dataset[MODEL_ID_KEY] = todoModel.guid;
            this.createBinding(component, XTodo.EVENT.STATUS_CHANGE, _handleTodoStatusChange).enable();
            this.createBinding(component, XTodo.EVENT.TEXT_CHANGE, _handleTodoTextChange).enable();
            this.createBinding(component, XTodo.EVENT.REMOVE, _handleTodoRemove).enable();
        };


        proto.remove = function (todoComponents) {
            todoComponents.forEach(function (todoComponent) {
                var element = todoComponent.element;
                var id = element.dataset[MODEL_ID_KEY];
                this.todoRepository.delete(id);
                Parser.unparse(todoComponent.element);
                element.parentNode.removeChild(element);
            }, this);
        };


        proto.toggleComplete = function (todoComponents, isComplete) {
            todoComponents.forEach(function (todoComponent) {
                var guid = todoComponent.element.dataset[MODEL_ID_KEY];
                this.todoRepository.update(guid, { complete: isComplete });
                todoComponent.checkbox.checked = isComplete;
            }, this);
        };


        proto.updateUI = function () {
            var todoComponents = this.getComponents(XTodo);
            if (todoComponents.length <= 0) {
                this.footer.style.display = 'none';
                this.checkAllBox.style.display = 'none';
                return;
            }
            var completedCount = todoComponents.filter(c => c.checkbox.checked).length;
            var remainingCount = todoComponents.length - completedCount;
            var areAllComplete = remainingCount <= 0;

            this.footer.style.display = '';
            this.checkAllBox.style.display = '';
            this.checkAllBox.checked = areAllComplete;

            this.remainingCount.innerHTML = remainingCount;
            this.clearCompletedButton.disabled = completedCount <= 0;
        };

    });
});
