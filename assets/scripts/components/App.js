define(function (require) {
    'use strict';

    var XElement = require('xelement');
    var routie = require('routie');
    var XNav = require('components/XNav');
    var XTodoList = require('components/XTodoList');


    return XElement.extend('html', 'x-app', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoList = this.getComponent(XTodoList, 'app.todoList');

            this.nav = this.getComponent(XNav, 'app.nav');

            this.registerRoutes();
        };


        proto.registerRoutes = function () {
            var self = this;
            routie({
                '': function () {
                    self.todoList.setFilter({});
                    self.nav.setState({ page: this.path });
                },
                '/active': function () {
                    self.todoList.setFilter({ completed: false });
                    self.nav.setState({ page: this.path });
                },
                '/completed': function () {
                    self.todoList.setFilter({ completed: true });
                    self.nav.setState({ page: this.path });
                }
            });
        };


    });
});
