/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Richard Petersen <richard.petersen@open-xchange.com>
 */

define('io.ox/chat/util', [

], function () {

    'use strict';

    var classNames = {
        'application/pdf': 'pdf',
        'image/svg': 'svg',
        'application/zip': 'zip',

        // images
        'image/jpeg': 'image',
        'image/gif': 'image',
        'image/bmp': 'image',
        'image/png': 'image',

        // documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'doc',
        'application/msword': 'doc',

        // excel
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'xls',
        'application/vnd.ms-excel': 'xls',

        // ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.template': 'ppt',
        'application/vnd.ms-powerpoint': 'ppt'
    };

    return {
        getClassFromMimetype: function (mimetype) {
            return classNames[mimetype];
        }
    };

});