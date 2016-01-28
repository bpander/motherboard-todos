define(function (require) {
    'use strict';

    var ModelAbstract = require('models/ModelAbstract');


    function TodoModel (guid) {
        ModelAbstract.call(this, guid);

        this.props.text = '';

        this.props.complete = false;

    }
    TodoModel.prototype = Object.create(ModelAbstract.prototype);
    TodoModel.prototype.constructor = TodoModel;


    return TodoModel;
});
