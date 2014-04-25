/* This file has been generated by ox-ui-module generator.
 * Please only apply minor changes (better no changes at all) to this file
 * if you want to be able to run the generator again without much trouble.
 *
 * If you really have to change this file for whatever reason, try to contact
 * the core team and describe your use-case. May be, your changes can be
 * integrated into the templates to be of use for everybody.
 */
'use strict';

module.exports = function (grunt) {

    grunt.config.extend('checkDependencies', {

        build: {
            options: {
                //don't check for devDependencies in build environments
                scopeList: ['dependencies', 'peerDependencies', 'optionalDependencies'],
                npmInstall: false
            }
        },
        dev: {
            options: {
                npmInstall: true
            }
        }

    });

    grunt.loadNpmTasks('grunt-check-dependencies');
};
