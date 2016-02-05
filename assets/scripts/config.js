require.config({
    paths: {
        'form-serialize': '../../bower_components/form-serialize/index',
        motherboard: '../../bower_components/motherboard/Motherboard',
        routie: '../../bower_components/routie/dist/routie',
        'state': '../../bower_components/State.js/State'
    },
    shim: {
        'form-serialize': {
            exports: 'window.formSerialize'
        }
    }
});
