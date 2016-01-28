define(function (require) {
    'use strict';

    var TodoModel = require('models/TodoModel');


    function TodoRepository () {

        this.localModels = [];

    }


    TodoRepository.prototype.fetch = function () {
        var rawModels = JSON.parse(localStorage.getItem('TodoRepository')) || [];
        this.localModels = rawModels.map(function (rawModel) {
            return new TodoModel(rawModel.guid).set(rawModel.props);
        });
        return this.localModels;
    };


    TodoRepository.prototype.push = function (models) {
        localStorage.setItem('TodoRepository', JSON.stringify(models));
        this.localModels = models;
    };


    TodoRepository.prototype.create = function (data) {
        var models = this.fetch();
        var model = new TodoModel().set(data);
        models.push(model);
        this.push(models);
        return model;
    };


    TodoRepository.prototype.update = function (guid, data) {
        var models = this.fetch();
        var model = models.find(function (model) {
            return model.guid === guid;
        });
        if (model === undefined) {
            console.warn('No model with guid "' + guid + '" found');
            return;
        }
        model.set(data);
        this.push(models);
    };


    TodoRepository.prototype.delete = function (guids) {
        if (typeof guids === 'string') {
            return this.delete([ guids ]);
        }
        var models = this.fetch();
        guids.forEach(function (guid) {
            var i = models.length;
            var model;
            while ((model = models[--i]) !== undefined) {
                if (model.guid === guid) {
                    models.splice(i, 1);
                    break;
                }
            }
        }, this);
        this.push(models);
    };


    TodoRepository.prototype.deleteWhere = function (predicate) {
        var models = this.fetch();
        var removed = [];
        var model;
        var prop;
        var i = models.length;
        while ((model = models[--i]) !== undefined) {
            for (prop in predicate) {
                if (predicate.hasOwnProperty(prop)) {
                    if (model.props[prop] === predicate[prop]) {
                        removed.push(models.splice(i, 1)[0]);
                    }
                }
            }
        }
        this.push(models);
        return removed;
    };


    return TodoRepository;
});
