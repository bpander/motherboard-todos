define(function (require) {
    'use strict';

    require('routie'); // requirejs shim + amdclean doesn't want to work with routie for some reason
    var routie = window.routie;
    var M = require('motherboard');
    var MNav = require('components/MNav');
    var MTodoList = require('components/MTodoList');


    return M.extend('html', 'm-app', function (proto, base) {


        proto.createdCallback = function () {
            base.createdCallback.call(this);

            this.todoList = this.getComponent(MTodoList, 'm-app.todoList');

            this.nav = this.getComponent(MNav, 'm-app.nav');

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
                    self.todoList.setFilter({ complete: false });
                    self.nav.setState({ page: this.path });
                },
                '/completed': function () {
                    self.todoList.setFilter({ complete: true });
                    self.nav.setState({ page: this.path });
                }
            });
        };


    });
});
