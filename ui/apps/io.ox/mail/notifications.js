/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011
 * Mail: info@open-xchange.com
 *
 * @author Mario Scheliga <mario.scheliga@open-xchange.com>
 */
define('io.ox/mail/notifications',
      ['io.ox/core/notifications/main',
       'io.ox/mail/api',
       'io.ox/mail/util',
       'io.ox/mail/view-notifications'], function (notificationService, mailApi, util, NotificationView) {

    'use strict';


    function register() {

        var notifications = notificationService.get('io.ox/mail', NotificationView);
        mailApi.on('new-mail', function (e, mails) {
            _(mails.reverse()).each(function (mail) {
                notifications.collection.unshift(new Backbone.Model(mail), {silent: true}); ///_(mails).clone());
            });
            notifications.collection.trigger('reset');
        });
    }

    return {
        register: register
    };
});
