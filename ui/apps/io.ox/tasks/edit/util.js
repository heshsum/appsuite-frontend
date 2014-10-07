/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2011 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/tasks/edit/util', ['gettext!io.ox/tasks'], function (gt) {

    'use strict';

    var util = {
        //build progressField and buttongroup
        buildProgress: function (val) {
            var val = val || 0,
                progress = $('<input class="form-control progress-field">').attr({ type: 'text', id: 'task-edit-progress-field', tabindex: 1 }).val(val),
                wrapper = $('<div class="input-group">').append(
                    progress,
                    $('<div class="input-group-btn">').append(
                        $('<button type="button" tabindex="1" class="btn btn-default" data-action="minus">').append(
                            $('<i class="fa fa-minus" aria-hidden="true">'),
                            $('<span class="sr-only">').text(gt('Minus'))
                        )
                        .on('click', function () {
                            var temp = parseInt(progress.val(), 10);
                            temp -= 25;
                            if (temp < 0) {
                                temp = 0;
                            }
                            if (temp !== parseInt(progress.val(), 10)) {
                                progress.val(temp);
                                progress.trigger('change');
                            }
                        }),
                        $('<button type="button" tabindex="1" class="btn btn-default" data-action="plus">').append(
                            $('<i class="fa fa-plus" aria-hidden="true">'),
                            $('<span class="sr-only">').text(gt('Plus'))
                        )
                        .on('click', function () {
                            var temp = parseInt(progress.val(), 10);
                            temp += 25;
                            if (temp > 100) {
                                temp = 100;
                            }
                            if (temp !== parseInt(progress.val(), 10)) {
                                progress.val(temp);
                                progress.trigger('change');
                            }
                        })
                    )
                );

            return { progress: progress, wrapper: wrapper };
        }
    };

    return util;
});
