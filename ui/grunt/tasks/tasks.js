/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author David Bauer <david.bauer@open-xchange.com>
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */

'use strict';
/* global Promise */

module.exports = function (grunt) {

    // displays the execution time of grunt tasks
    if (grunt.option('benchmark') || grunt.config('local.benchmark')) require('time-grunt')(grunt);

    grunt.registerTask('bootjs', ['copy:build_ox', 'concat:bootjs']);

    grunt.registerTask('lint', ['newer:eslint:all']);
    grunt.registerTask('lint:specs', ['newer:eslint:all']);

    //Override the default tasks

    //default implementation uses newer, we don't want that, because it has some problems and copy is fast anyway
    grunt.registerTask('copy_build', grunt.util.runPrefixedSubtasksFor('copy', 'build'));

    // steps to build the ui (ready for development)
    grunt.registerTask('build', ['lint', 'workaround_fetch', 'copy_build', 'compile_po', 'concat', 'newer:less']);
    // create a package ready version of the ui (aka what jenkins does)
    grunt.registerTask('dist', ['clean', 'copy_build', 'compile_po', 'concat', 'newer:less', 'uglify', 'copy_dist', 'create_i18n_properties']);

    grunt.registerTask('force_update', ['bootjs', 'copy:build_base']);

    grunt.registerTask('workaround_fetch', function () {
        var appserver = require('appserver'),
            mirrorFile = appserver.tools.mirrorFile,
            config = appserver.tools.unifyOptions(grunt.config('local.appserver')),
            done = this.async();
        Promise.all([
            config.prefixes[0] + 'apps/io.ox/office/tk/definitions.less',
            config.prefixes[0] + 'apps/io.ox/office/tk/icons/definitions.less',
            config.prefixes[0] + 'apps/io.ox/office/tk/icons/docs-icons.less',
            config.prefixes[0] + 'apps/oxguard/tour/style.less'
        ].map(function (fileName) {
            if (grunt.file.exists(fileName)) return;
            return mirrorFile(fileName, fileName.replace(config.prefixes[0], 'v=7.x.x/'), config);
        })).then(done);
    });
    grunt.registerTask('prefetch:static', function () {
        var appserver = require('appserver'),
            mirrorFile = appserver.tools.mirrorFile,
            config = appserver.tools.unifyOptions(grunt.config('local.appserver')),
            fileName = grunt.option('output'),
            done = this.async();
        mirrorFile(fileName, fileName.replace(config.prefixes[0], 'v=7.x.x/'), config)
            .then(done);
    });
    grunt.registerTask('prefetch:appsLoad', function () {
        var appserver = require('appserver'),
            mirrorFile = appserver.tools.mirrorFile,
            config = appserver.tools.unifyOptions(grunt.config('local.appserver')),
            fileName = grunt.option('output'),
            done = this.async();
        mirrorFile(fileName, fileName.replace(config.prefixes[0] + 'apps/', 'api/apps/load/v=7.x.x,'), config)
            .then(done);
    });
};
