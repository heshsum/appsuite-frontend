/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

define('io.ox/mail/categories/mediator', [
    'io.ox/core/capabilities',
    'io.ox/core/extensions',
    'io.ox/mail/categories/api',
    'io.ox/mail/api',
    'io.ox/mail/categories/tabs',
    'io.ox/core/yell',
    'settings!io.ox/mail',
    'gettext!io.ox/mail'
], function (capabilities, ext, api, mailAPI, TabView, yell, settings, gt) {

    'use strict';

    // helpers
    var DEFAULT_CATEGORY = 'general',
        INBOX = settings.get('folder/inbox'),
        isVisible = false,
        helper = {
            isVisible: function () {
                return isVisible;
            },
            getInitialCategoryId: function () {
                return DEFAULT_CATEGORY;
            }
        };

    // early exit
    if (!capabilities.has('mail_categories')) return helper;
    if (_.device('smartphone')) return helper;

    // extend mediator
    ext.point('io.ox/mail/mediator').extend(
        {
            id: 'toggle-category-tabs',
            index: 20000,
            setup: function (app) {

                function isEnabled() {
                    return !!app.props.get('categories');
                }

                function isInbox() {
                    return app.folder.get() === INBOX;
                }

                function toggleCategories() {
                    // ensure inbox if enabled but in a different folder
                    if (isEnabled() && !isInbox()) app.folder.set(INBOX);
                    isVisible = isEnabled() && isInbox();
                    app.getWindow().nodes.outer.toggleClass('mail-categories-visible', isVisible);
                    app.listView.model.set('category_id', isVisible ? app.props.get('category_id') : undefined);
                }

                app.props.on('change:categories', toggleCategories);
                app.on('folder:change', toggleCategories);

                toggleCategories();
            }
        },
        {
            id: 'foward-category-id',
            index: 20100,
            setup: function (app) {
                // update collection loaders parameter
                app.props.on('change:category_id', function (model, value) {
                    if (!isVisible) return;
                    app.listView.model.set('category_id', value);
                });
            }
        },
        {
            id: 'category-tabs',
            index: 20200,
            setup: function (app) {

                function refresh(options) {
                    // reload 'current tab'
                    app.listView.reload();
                    // flag collections as expired
                    var rCategory = new RegExp('categoryid=' + options.target);
                    _.each(mailAPI.pool.getCollections(), function (collection, id) {
                        if (rCategory.test(id)) collection.expired = true;
                    });
                    // remove expired collections
                    mailAPI.pool.gc();
                }

                // add placeholder
                app.getWindow().nodes.body.addClass('classic-toolbar-visible').prepend(
                    $('<div class="categories-toolbar-container">').append(
                        new TabView({ props: app.props }).render().$el
                    )
                );

                // events
                api.on('move train', refresh);
                api.collection.on('save', refresh.bind(this, { target: 'general' }));
            }
        },
        {
            id: 'ensure-category-id',
            index: 20300,
            setup: function (app) {

                // current category gets disabled: use 'general' as fallback
                api.collection.on('change:enabled', function (model, enabled) {
                    if (enabled) return;
                    if (model.id !== app.props.get('category_id')) return;
                    app.props.set('category_id', DEFAULT_CATEGORY);
                });
            }
        },
        {
            id: 'check-category-state',
            index: 20400,
            setup: function (app) {
                if (!app.props.get('categories')) return;
                if (settings.get('categories/initialized') !== 'running') return;
                //#. mail categories feature: the update job is running that assigns
                //#. some common mails (e.g. from twitter.com) to predefined categories
                yell('info', gt('It may take some time until mails are assigned to the default categories.'));
            }
        }
    );

    return helper;
});
