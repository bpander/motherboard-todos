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

            this.xtodos = [];

            this.todoRepository = new TodoRepository();

            this.createBinding(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.createBinding(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.createBinding(this.xform, this.xform.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.createBinding(this, XTodo.prototype.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange);
            this.createBinding(this, XTodo.prototype.EVENT.TEXT_CHANGE, proto.handleTodoTextChange);
            this.createBinding(this, XTodo.prototype.EVENT.REMOVE, proto.handleTodoRemove);
            this.enable();

            var models = this.todoRepository.fetch();
            Array.prototype.push.apply(this.xtodos, models.map(function (todo) { return this.createTodoFromModel(todo); }, this));
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
            var filter = this.filter;
            var filterKeys = Object.keys(filter);
            var models = this.todoRepository.localModels.filter(function (model) {
                return filterKeys.every(function (key) {
                    return model.props[key] === filter[key];
                });
            });
            var guids = models.map(function (model) { return model.guid; });
            xtodos.forEach(function (xtodo) {
                var guid = XElement.getTag(xtodo);
                var doShow = guids.indexOf(guid) > -1;
                this.xtodos.push(xtodo);
                if (doShow) {
                    this.xlist.add(xtodo);
                }
            }, this);
        };


        proto.remove = function (xtodos) {
            xtodos.forEach(function (xtodo) {
                var i = this.xtodos.indexOf(xtodo);
                if (i > -1) {
                    this.xtodos.splice(i, 1);
                }
                this.xlist.remove(xtodo);
            }, this);
        };


        proto.setFilter = function (filter) {
            this.filter = filter;
            this.updateList();
        };


        proto.updateList = function () {
            this.xlist.empty();
            this.add(this.xtodos.splice(0, this.xtodos.length));
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
            this.xtodos.push(this.createTodoFromModel(todoModel));
            this.xform.reset();
            this.updateList();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            var guid = XElement.getTag(e.target);
            this.todoRepository.update(guid, { complete: e.target.checkbox.checked });
            this.updateList();
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
            var complete = e.target.checked;
            this.xtodos.forEach(function (xtodo) {
                var guid = XElement.getTag(xtodo);
                xtodo.setState({ complete: complete });
                this.todoRepository.update(guid, { complete: complete }); // TODO: This could be optimized by updating multiple models at once
            }, this);
            this.updateList();
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var removed = this.todoRepository.deleteWhere({ complete: true });
            removed.forEach(function (model) {
                this.remove([ this.xtodos.find(function (xtodo) { return XElement.getTag(xtodo) === model.guid; }) ]);
            }, this);
            this.updateUI();
        };

    });
});
