define(function (require) {
    'use strict';

    var M = require('motherboard');
    var MForm = require('components/MForm');
    var MList = require('components/MList');
    var MStatefulElement = require('components/MStatefulElement');
    var MTodo = require('components/MTodo');
    var TodoRepository = require('repositories/TodoRepository');


    return M.extend(MStatefulElement, 'm-todo-list', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.state = {
                totalCount: 0,
                completedCount: 0
            };

            this.filter = {};

            this.todoTemplate = this.findWithTag('m-todo-list.todoTemplate');

            this.checkAllBox = this.findWithTag('m-todo-list.checkAllBox');

            this.clearCompletedButton = this.findWithTag('m-todo-list.clearCompletedButton');

            this.mform = this.getComponent(MForm, 'm-todo-list.mform');

            this.mlist = this.getComponent(MList, 'm-todo-list.mlist');

            this.mtodos = [];

            this.todoRepository = new TodoRepository();

            this.listen(this.checkAllBox, 'change', proto.handleCheckAllChange);
            this.listen(this.clearCompletedButton, 'click', proto.handleClearCompletedClick);
            this.listen(this.mform, this.mform.EVENT.CUSTOM_SUBMIT, proto.handleSubmit);
            this.listen(this, MTodo.prototype.EVENT.STATUS_CHANGE, proto.handleTodoStatusChange);
            this.listen(this, MTodo.prototype.EVENT.TEXT_CHANGE, proto.handleTodoTextChange);
            this.listen(this, MTodo.prototype.EVENT.REMOVE, proto.handleTodoRemove);
            this.enable();

            var models = this.todoRepository.fetch();
            Array.prototype.push.apply(this.mtodos, models.map(function (model) { return this.createTodoFromModel(model); }, this));
            this.updateUI();
        };


        proto.createTodoFromModel = function (model) {
            var docFrag = document.importNode(this.todoTemplate.content, true);
            var mtodo = docFrag.querySelector(MTodo.prototype.selector);
            M.setTag(mtodo, model.guid);
            mtodo.setState(model.props);
            return mtodo;
        };


        proto.add = function (mtodos) {
            var filter = this.filter;
            var filterKeys = Object.keys(filter);
            var models = this.todoRepository.localModels.filter(function (model) {
                return filterKeys.every(function (key) {
                    return model.props[key] === filter[key];
                });
            });
            var guids = models.map(function (model) { return model.guid; });
            mtodos.forEach(function (mtodo) {
                var guid = M.getTag(mtodo);
                var doShow = guids.indexOf(guid) > -1;
                this.mtodos.push(mtodo);
                if (doShow) {
                    this.mlist.add(mtodo);
                }
            }, this);
        };


        proto.remove = function (mtodos) {
            mtodos.forEach(function (mtodo) {
                var i = this.mtodos.indexOf(mtodo);
                if (i > -1) {
                    this.mtodos.splice(i, 1);
                }
                this.mlist.remove(mtodo);
            }, this);
        };


        proto.setFilter = function (filter) {
            this.filter = filter;
            this.updateList();
        };


        proto.updateList = function () {
            this.mlist.empty();
            this.add(this.mtodos.splice(0, this.mtodos.length));
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
            this.mtodos.push(this.createTodoFromModel(todoModel));
            this.mform.reset();
            this.updateList();
            this.updateUI();
        };


        proto.handleTodoStatusChange = function (e) {
            var guid = M.getTag(e.target);
            this.todoRepository.update(guid, { complete: e.target.checkbox.checked });
            this.updateList();
            this.updateUI();
        };


        proto.handleTodoTextChange = function (e) {
            var guid = M.getTag(e.target);
            this.todoRepository.update(guid, { text: e.detail.text });
        };


        proto.handleTodoRemove = function (e) {
            this.todoRepository.delete(M.getTag(e.target));
            this.remove([ e.target ]);
            this.updateUI();
        };


        proto.handleCheckAllChange = function (e) {
            var complete = e.target.checked;
            this.mtodos.forEach(function (mtodo) {
                var guid = M.getTag(mtodo);
                mtodo.setState({ complete: complete });
                this.todoRepository.update(guid, { complete: complete }); // TODO: This could be optimized by updating multiple models at once
            }, this);
            this.updateList();
            this.updateUI();
        };


        proto.handleClearCompletedClick = function () {
            var removed = this.todoRepository.deleteWhere({ complete: true });
            removed.forEach(function (model) {
                this.remove([ this.mtodos.find(function (mtodo) { return M.getTag(mtodo) === model.guid; }) ]);
            }, this);
            this.updateUI();
        };

    });
});
