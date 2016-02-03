require.config({
    paths: {
        'form-serialize': '../../bower_components/form-serialize/index',
        routie: '../../bower_components/routie/dist/routie',
        xelement: '../../bower_components/xelement/XElement'
    },
    shim: {
        'form-serialize': {
            exports: 'window.formSerialize'
        }
    }
});
