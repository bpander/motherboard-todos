define(function (require) {
    'use strict';

    var TodoModel = require('models/TodoModel');


    function TodoRepository () {

    }


    TodoRepository.prototype.fetch = function () {
        var rawModels = JSON.parse(localStorage.getItem('TodoRepository')) || [];
        return rawModels.map(function (rawModel) {
            return new TodoModel(rawModel.guid).set(rawModel.props);
        });
    };


    TodoRepository.prototype.push = function (data) {
        localStorage.setItem('TodoRepository', JSON.stringify(data));
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


    return TodoRepository;
});
