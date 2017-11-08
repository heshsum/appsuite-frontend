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
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/chat/views/empty', ['io.ox/backbone/views/disposable'], function (DisposableView) {

    'use strict';

    return DisposableView.extend({

        render: function () {
            this.$el.append(
                $('<div class="start-chat abs">').append(
                    $('<button type="button" class="btn btn-default" data-cmd="start-chat">').append(
                        $('<i class="fa fa-plus">'),
                        $('<br>'),
                        $.txt('Start new chat')
                    )
                )
            );
            return this;
        }
    });
});
