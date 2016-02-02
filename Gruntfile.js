module.exports = function(grunt) {
    'use strict';


    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        requirejs: {
            dist: {
                options: {
                    findNestedDependencies: true,
                    baseUrl: 'assets/scripts',
                    mainConfigFile: 'assets/scripts/config.js',
                    optimize: 'none',
                    include: ['main'],
                    name: '../../node_modules/almond/almond',
                    out: 'built/main.js'
                }
            }
        },


        uglify: {
            dist: {
                files: {
                    'built/main.min.js': ['built/main.js']
                }
            }
        }

    });


    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-uglify');


    // Define tasks
    grunt.registerTask('default', ['requirejs:dist', 'uglify:dist']);

};