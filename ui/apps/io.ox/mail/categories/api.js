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
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

define('io.ox/mail/categories/api', [
    'io.ox/core/http',
    'io.ox/mail/api',
    'settings!io.ox/mail'
], function (http, mailAPI, settings) {

    'use strict';

    var Model = Backbone.Model.extend({

        defaults: function () {
            return {
                unread: 0,
                active: true,
                permissions: []
            };
        },

        toJSON: function () {
            // sync/store only specific properties
            return this.pick('id', 'name', 'active', 'enabled');
        },

        getCount: function () {
            return this.get('unread') === 0 ? '' : this.get('unread');
        },

        can: function (id) {
            return this.get('permissions').indexOf(id) > -1;
        },

        isEnabled: function () {
            return this.get('active');
        }
    });

    var Collection = Backbone.Collection.extend({

        model: Model,

        initialize: function () {
            this.refresh();
            this.register();
        },

        register: function () {
            this.on('change:name change:active', _.debounce(this.save, 200));
            mailAPI.on('after:refresh.unseen after:refresh.seen refresh.all ', _.debounce(this.refresh.bind(this), 200));
        },

        refresh: function () {
            var def = $.Deferred(),
                self = this;
            // defer to ensure mail requests multiple first
            _.defer(function () {
                api.getUnread().then(function (data) {
                    data = _.map(data, function (value, key) {
                        return { id: key, unread: value };
                    });
                    self.add(data, { merge: true });
                    def.resolve();
                });
            });
            return def;
        },

        save: function () {
            settings.set('categories/list', this.toJSON())
                .save(undefined, { force: true })
                .done(this.trigger.bind(this, 'save'));
        }
    });

    // plain list of mail addresses
    function getSenderAddresses(data) {
        return _.chain(data)
            .map(function (obj) { return obj.from[0][1]; })
            .uniq()
            .value();
    }

    var api = _.extend({}, Backbone.Events, {

        collection: new Collection(settings.get('categories/list', [])),

        getUnread: function () {
            return http.GET({
                module: 'mail/categories',
                params: {
                    action: 'unread'
                }
            });
        },

        // add mail to category
        move: function (options) {

            if (!options.data || !options.data.length) return $.when();

            var data = _.map(options.data, function (obj) {
                return _.pick(obj, 'id', 'folder_id');
            });

            return http.PUT({
                module: 'mail/categories',
                params: {
                    'action': 'move',
                    'category_id': options.target
                },
                data: data
            })
            .then(function () {
                api.trigger('move', options);
            });
        },

        // generate rule(s) to add mail to category
        train: function (options) {

            var opt = _.extend({ past: true, future: true }, options);

            if (!opt.target || !opt.data) return $.when();

            return http.PUT({
                module: 'mail/categories',
                params: {
                    'action': 'train',
                    'category_id': opt.target,
                    'apply-for-existing': opt.past,
                    'apply-for-future-ones': opt.future
                },
                data: {
                    from: getSenderAddresses(options.data)
                }
            })
            .then(function () {
                api.trigger('train', options);
            });
        }
    });

    return api;
});
