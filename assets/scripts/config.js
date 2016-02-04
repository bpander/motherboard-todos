require.config({
    paths: {
        'form-serialize': '../../bower_components/form-serialize/index',
        routie: '../../bower_components/routie/dist/routie',
        motherboard: '../../bower_components/motherboard/Motherboard'
    },
    shim: {
        'form-serialize': {
            exports: 'window.formSerialize'
        }
    }
});
