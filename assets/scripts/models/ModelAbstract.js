define(function (require) {
    'use strict';


    function ModelAbstract (guid) {

        this.guid = guid || ModelAbstract.generateGUID();

        this.props = {};

    }


    var _s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };


    ModelAbstract.generateGUID = function () {
        return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + _s4() + _s4();
    };


    ModelAbstract.prototype.set = function (props) {
        var selfProps = this.props;
        var prop;
        for (prop in props) {
            if (props.hasOwnProperty(prop) && selfProps.hasOwnProperty(prop)) {
                selfProps[prop] = props[prop];
            }
        }
        return this;
    };


    return ModelAbstract;
});
