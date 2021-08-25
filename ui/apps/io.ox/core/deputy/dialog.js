/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

define('io.ox/core/deputy/dialog', [
    'io.ox/backbone/views/modal',
    'io.ox/backbone/views/disposable',
    'io.ox/backbone/mini-views',
    'io.ox/participants/add',
    'io.ox/core/folder/api',
    'io.ox/contacts/util',
    'io.ox/core/deputy/api',
    'io.ox/core/api/user',
    'gettext!io.ox/core',
    'less!io.ox/core/deputy/style'
], function (ModalDialog, DisposableView, mini, AddParticipantView, folderApi, util, api, userApi, gt) {

    'use strict';

    var permissions = {
            none: 0,
            viewer: 257,
            editor: 33025,
            author: 4227332
        },
        // permissions given to newly added deputies
        defaultPermissions = {
            'sendOnBehalf': false,
            'modulePermissions': {
                'mail': {
                    'permission': permissions.viewer,
                    'folderIds': [
                        folderApi.getDefaultFolder('mail')
                    ]
                },
                'calendar': {
                    'permission': permissions.viewer,
                    'folderIds': [
                        folderApi.getDefaultFolder('calendar')
                    ]
                }
            }
        },
        // some translation helpers
        moduleMap = {
            mail: gt('Inbox'),
            calendar: gt('Calendar')
        },
        permissionMap = {
            0: gt('None'),
            257: gt('Viewer'),
            33025: gt('Editor'),
            4227332: gt('Author')
        };


    function getPermissionText(model) {
        var parts = _(model.get('modulePermissions')).map(function (module, key) {
            //#. String that is used to describe permissions
            //#. %1$s name of module (mail, calendar etc)
            //#. %2$s the granted role (author, editor, viewer, none)
            return gt('%1$s (%2$s)', moduleMap[key], permissionMap[module.permission]);
        });

        if (model.get('sendOnBehalf')) parts.push(gt('Allowed to send emails on your behalf'));
        return parts.join(', ');
    }

    function openEditDialog(model) {
        var prevValues = {
            sendOnBehalf: model.get('sendOnBehalf'),
            modulePermissions: model.get('modulePermissions')
        };

        new ModalDialog({
            //#. %1$s name of the deputy
            title: gt('Deputy: %1$s', util.getFullName(model.get('userData').attributes, false))
        })
        .build(function () {
            // temp models for the selectboxes since the cannot work with the nested attributes directly
            var calendarModel = new Backbone.Model({ permission: model.get('modulePermissions').calendar.permission }),
                mailModel = new Backbone.Model({ permission: model.get('modulePermissions').mail.permission });

            // sync to main model
            mailModel.on('change:permission', function (obj, value) {
                var permissions = model.get('modulePermissions');
                permissions.mail.permission = value;
                model.set('modulePermissions', permissions);
            });
            calendarModel.on('change:permission', function (obj, value) {
                var permissions = model.get('modulePermissions');
                permissions.calendar.permission = value;
                model.set('modulePermissions', permissions);
            });

            this.$body.append(
                $('<div>').text(gt('The deputy has the following permissions')),
                $('<div class="select-container">').append(
                    $('<label for="inbox-deputy-selector">').text(moduleMap.mail),
                    new mini.SelectView({ id: 'inbox-deputy-selector', name: 'permission', model: mailModel, list: [
                        { value: permissions.none, label: gt('None') },
                        { value: permissions.viewer, label: gt('Viewer (read emails)') },
                        // do these roles make any sense? Is this only for drafts?
                        { value: permissions.editor, label: gt('Editor (create/edit emails)') },
                        { value: permissions.author, label: gt('Author (create/edit/delete emails)') }
                    ] }).render().$el
                ),
                new mini.CustomCheckboxView({ id: 'send-on-behalf-checkbox', name: 'sendOnBehalf', label: gt('Deputy can send emails on your behalf'), model: model }).render().$el,
                $('<div class="select-container">').append(
                    $('<label for="inbox-deputy-selector">').text(moduleMap.calendar),
                    new mini.SelectView({ id: 'calendar-deputy-selector', name: 'permission', model: calendarModel, list: [
                        { value: permissions.none, label: gt('None') },
                        { value: permissions.viewer, label: gt('Viewer (view appointments)') },
                        { value: permissions.editor, label: gt('Editor (create/edit appointments)') },
                        { value: permissions.author, label: gt('Author (create/edit/delete appointments)') }
                    ] }).render().$el
                )
            ).addClass('deputy-permissions-dialog');
        })
        .addCancelButton()
        .addButton({ className: 'btn-primary', label: gt('save'), action: 'save' })
        .on('cancel', function () {
            // cancel on a model that was not saved means we should remove it from the list
            if (model.get('deputyId') === undefined) {
                model.collection.remove(model);
                return;
            }
            model.set(prevValues);
        })
        .on('save', function () {
            // triggers redraw of the list. Listeners on each model change would redraw too often
            model.collection.trigger('reset');
            if (model.get('deputyId') === undefined) {
                api.create(model).then(function (id) {
                    model.set('deputyId', id);
                });
                return;
            }
            api.update(model);
        })
        .open();
    }

    var deputyListView = DisposableView.extend({

        events: {
            'click .remove': 'removeDeputy',
            'click .edit': 'showPermissions'
        },

        tagName: 'ul',
        className: 'deputy-list-view list-unstyled',

        initialize: function (options) {
            options = options || {};
            this.collection = new Backbone.Collection(options.deputies);
            this.collection.on('add reset remove', this.render.bind(this));
        },
        render: function () {
            this.$el.empty();

            if (this.collection.length === 0) this.$el.append($('<div class="empty-message">').append(gt('You have currently no deputies assigned.') + '<br/>' + gt('Deputies can get acces to your Inbox and Calendar.')));

            this.collection.each(this.renderDeputy.bind(this));
            return this;
        },
        renderDeputy: function (deputy) {
            var user = deputy.get('userData'),
                name = util.getFullName(user.attributes, false),
                initials = util.getInitials(user.attributes),
                initialsColor = util.getInitialsColor(initials),
                userPicture = user.get('image1_url') ? $('<i class="user-picture" aria-hidden="true">').css('background-image', 'url(' + util.getImage(user.attributes) + ')')
                    : $('<div class="user-picture initials" aria-hidden="true">').text(initials).addClass(initialsColor);


            this.$el.append(
                $('<li>').attr('data-id', user.get('id')).append(
                    $('<div class="flex-item">').append(
                        userPicture,
                        $('<div class="data-container">').append(
                            $('<div class="name">').text(name),
                            $('<div class="permissions">').text(getPermissionText(deputy))
                        )
                    ),
                    $('<div class="flex-item">').append(
                        $('<button class="btn btn-link edit">').attr('data-cid', deputy.cid).text(gt('Edit')),
                        $('<button class="btn btn-link remove">').attr('data-cid', deputy.cid).append($.icon('fa-times', gt('Remove')))
                    )
                )
            );
        },
        removeDeputy: function (e) {
            e.stopPropagation();
            var model = this.collection.get(e.currentTarget.getAttribute('data-cid'));
            if (!model) return;
            api.remove(model);
            this.collection.remove(model);
        },
        showPermissions: function (e) {
            var model = this.collection.get(e.currentTarget.getAttribute('data-cid'));
            if (!model) return;

            openEditDialog(model);
        }
    });

    function openDialog() {
        new ModalDialog({
            point: 'io.ox/core/deputy/dialog',
            title: gt('Manage deputies'),
            width: 640
        })
        .build(function () {
            var self = this,
                // collection to store userdata
                userCollection = new Backbone.Collection();

            this.$body.busy();
            api.getAll().then(function (deputies) {
                var defs = _(deputies).map(function (deputy) {
                    return userApi.get({ id: deputy.user }).then(function (data) {
                        userCollection.add(data);
                        deputy.userData = userCollection.get(data);
                    });
                });

                $.when.apply($, defs).then(function () {
                    self.$body.idle();
                    // since this is async modal dialog may think the body is empty and adds this class
                    self.$el.removeClass('compact');
                    self.deputyListView = new deputyListView({ deputies: deputies });
                    self.$body.append(
                        new AddParticipantView({
                            apiOptions: {
                                users: true
                            },
                            placeholder: gt('Add people'),
                            collection: userCollection,
                            scrollIntoView: true,
                            useGABOnly: true
                        }).render().$el,
                        self.deputyListView.render().$el
                    );

                    self.$body.find('input.add-participant').focus();

                    userCollection.on('add', function (user) {
                        var deputy = _.extend({}, defaultPermissions, { user: user.get('id'), userData: user }),
                            model = self.deputyListView.collection.add(deputy);

                        openEditDialog(model);
                    });

                    // deputy removed? remove from user collection as well
                    self.deputyListView.collection.on('remove', function (deputy) {
                        userCollection.remove(deputy.get('user'));
                    });
                });
            });
        })
        .addButton({ className: 'btn-primary', label: gt('close'), action: 'cancel' })
        .open();
    }

    return {
        open: openDialog
    };
});