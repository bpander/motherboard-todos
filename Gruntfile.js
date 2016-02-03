module.exports = function (grunt) {
    'use strict';

    var fs = require('fs');
    var amdclean = require('amdclean');


    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        requirejs: {
            dist: {
                options: {
                    findNestedDependencies: true,
                    baseUrl: 'assets/scripts',
                    mainConfigFile: 'assets/scripts/config.js',
                    optimize: 'uglify2',
                    include: ['main'],
                    out: 'built/main.js',
                    onModuleBundleComplete: function (data) {
                        var outputFile = data.path;

                        fs.writeFileSync(outputFile, amdclean.clean({
                            filePath: outputFile
                        }));
                    }
                }
            }
        }


    });


    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-requirejs');


    // Define tasks
    grunt.registerTask('default', ['requirejs:dist']);

};