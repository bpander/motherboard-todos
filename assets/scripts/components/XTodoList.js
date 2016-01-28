define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var XForm = require('components/XForm');
    var XList = require('components/XList');
    var XStatefulElement = require('components/XStatefulElement');
    var XTodo = require('components/XTodo');
    var TodoRepository = require('repositories/TodoRepository');


    return XElement.extend(XStatefulElement, 'x-todo-list', function (proto, base) {


        var MODEL_ID_KEY = 'todosModelId';


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                totalCount: 0,
                completedCount: 0
            };

            this.todoTemplate = this.findWithTag('x-todo-list.todoTemplate');

            this.checkAllBox = this.findWithTag('TodosDispatcher:checkAllBox');

            this.clearCompletedButton = this.findWithTag('TodosDispatcher:clearCompletedButton');

            this.xform = this.getComponent(XForm, 'x-todo-list.xform');

            this.xlist = this.getComponent(XList, 'x-todo-list.xlist');

            this.todoRepository = new TodoRepository();

            this.createBinding(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.createBinding(this.xform, this.xform.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.createBinding(this, XTodo.prototype.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange);
            this.createBinding(this, XTodo.prototype.EVENT.TEXT_CHANGE, proto.handleTodoTextChange);
            this.createBinding(this, XTodo.prototype.EVENT.REMOVE, proto.handleTodoRemove);
            this.enable();

            this.add( this.todoRepository.fetch().map(todo => this.createTodoFromModel(todo)) );
            this.updateUI();
        };


        proto.createTodoFromModel = function (model) {
            var docFrag = document.importNode(this.todoTemplate.content, true);
            var xtodo = docFrag.querySelector(XTodo.prototype.selector);
            xtodo.setState(model.props);
            xtodo.dataset[MODEL_ID_KEY] = model.guid;
            return xtodo;
        };


        proto.add = function (xtodos) {
            // TODO: Filter stuff goes here
            xtodos.forEach(xtodo => this.xlist.add(xtodo));
        };


        proto.remove = function (xtodos) {
            xtodos.forEach(xtodo => this.xlist.remove(xtodo));
        };


        proto.updateUI = function () {
            // TODO: Refactor this with model data from the repository
            var todoComponents = this.getComponents(XTodo);
            var totalCount = todoComponents.length;
            this.setState({
                totalCount: totalCount,
                completedCount: todoComponents.filter(c => c.checkbox.checked).length
            });
        };


        proto.handleSubmit = function (e) {
            var todoModel = this.todoRepository.create(e.detail.request);
            this.add([ this.createTodoFromModel(todoModel) ]);
            this.xform.reset();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            var guid = e.target.dataset[MODEL_ID_KEY];
            this.todoRepository.update(guid, { complete: e.target.checkbox.checked });
            this.updateUI();
        };


        proto.handleTodoTextChange = function (e) {
            var guid = e.target.dataset[MODEL_ID_KEY];
            this.todoRepository.update(guid, { text: e.detail.text });
        };


        proto.handleTodoRemove = function (e) {
            this.todoRepository.delete(e.target.dataset[MODEL_ID_KEY]);
            this.remove([ e.target ]);
            this.updateUI();
        };


        proto.handleCheckAllChange = function (e) {
            var complete = e.target.checked;
            this.getComponents(XTodo).forEach(xtodo => {
                var guid = xtodo.dataset[MODEL_ID_KEY];
                xtodo.setState({ complete: complete });
                this.todoRepository.update(guid, { complete: complete }); // TODO: This could be optimized by updating multiple models at once
            });
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var completed = this.getComponents(XTodo).filter(c => c.checkbox.checked);
            this.todoRepository.delete(completed.map(xtodo => xtodo.dataset[MODEL_ID_KEY]));
            this.remove(completed);
            this.updateUI();
        };

    });
});
