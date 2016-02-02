define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var XForm = require('components/XForm');
    var XList = require('components/XList');
    var XStatefulElement = require('components/XStatefulElement');
    var XTodo = require('components/XTodo');
    var TodoRepository = require('repositories/TodoRepository');


    return XElement.extend(XStatefulElement, 'x-todo-list', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                totalCount: 0,
                completedCount: 0
            };

            this.filter = {};

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

            var self = this;
            this.add( this.todoRepository.fetch().map(function (todo) { return self.createTodoFromModel(todo); }) );
            this.updateUI();
        };


        proto.createTodoFromModel = function (model) {
            var docFrag = document.importNode(this.todoTemplate.content, true);
            var xtodo = docFrag.querySelector(XTodo.prototype.selector);
            XElement.setTag(xtodo, model.guid);
            xtodo.setState(model.props);
            return xtodo;
        };


        proto.add = function (xtodos) {
            // TODO: Filter stuff goes here
            var self = this;
            xtodos.forEach(function (xtodo) { self.xlist.add(xtodo); });
        };


        proto.remove = function (xtodos) {
            var self = this;
            xtodos.forEach(function (xtodo) { self.xlist.remove(xtodo); });
        };


        proto.setFilter = function (filter) {
            console.log(filter);
        };


        proto.updateUI = function () {
            var todoModels = this.todoRepository.localModels;
            var totalCount = todoModels.length;
            this.setState({
                totalCount: totalCount,
                completedCount: todoModels.filter(function (model) { return model.props.complete; }).length
            });
        };


        proto.handleSubmit = function (e) {
            var todoModel = this.todoRepository.create(e.detail.request);
            this.add([ this.createTodoFromModel(todoModel) ]);
            this.xform.reset();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            var guid = XElement.getTag(e.target);
            this.todoRepository.update(guid, { complete: e.target.checkbox.checked });
            this.updateUI();
        };


        proto.handleTodoTextChange = function (e) {
            var guid = XElement.getTag(e.target);
            this.todoRepository.update(guid, { text: e.detail.text });
        };


        proto.handleTodoRemove = function (e) {
            this.todoRepository.delete(XElement.getTag(e.target));
            this.remove([ e.target ]);
            this.updateUI();
        };


        proto.handleCheckAllChange = function (e) {
            var self = this;
            var complete = e.target.checked;
            this.getComponents(XTodo).forEach(function (xtodo) {
                var guid = XElement.getTag(xtodo);
                xtodo.setState({ complete: complete });
                self.todoRepository.update(guid, { complete: complete }); // TODO: This could be optimized by updating multiple models at once
            });
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var removed = this.todoRepository.deleteWhere({ complete: true });
            removed.forEach(function (model) {
                this.remove([ this.getComponent(XTodo, model.guid) ]);
            }, this);
            this.updateUI();
        };

    });
});
