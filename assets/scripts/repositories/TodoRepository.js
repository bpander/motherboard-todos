define(function (require) {
    'use strict';


    function TodoRepository () {

    }


    var _generateGUID = function () {
        function s4 () {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };


    var _todoInterface = {
        guid: null,
        data: {
            text: '',
            complete: false
        }
    };


    TodoRepository.prototype.fetch = function () {
        return JSON.parse(localStorage.getItem('TodoRepository') || '[]');
    };


    TodoRepository.prototype.push = function (data) {
        localStorage.setItem('TodoRepository', JSON.stringify(data));
    };


    TodoRepository.prototype.create = function (data) {
        var models = this.fetch();
        // TODO: This needs to be a deepmerge to work right (.data properties get overwritten), it should be a model instead
        var model = Object.assign({}, _todoInterface, {
            guid: _generateGUID(),
            data: data
        });
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
        Object.assign(model.data, data);
        this.push(models);
    };


    TodoRepository.prototype.delete = function (guid) {
        var models = this.fetch();
        var i = models.length;
        var model;
        while ((model = models[--i]) !== undefined) {
            if (model.guid === guid) {
                models.splice(i, 1);
                break;
            }
        }
        this.push(models);
    };


    return TodoRepository;
});
