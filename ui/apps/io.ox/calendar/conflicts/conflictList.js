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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define('io.ox/calendar/conflicts/conflictList', [
    'io.ox/core/extensions',
    'io.ox/calendar/common-extensions',
    'io.ox/calendar/api',
    'io.ox/core/folder/api',
    'io.ox/core/api/user',
    'io.ox/core/api/resource',
    'io.ox/core/util',
    'io.ox/calendar/util',
    'io.ox/contacts/util',
    'io.ox/backbone/views/modal',
    'gettext!io.ox/calendar/conflicts/conflicts',
    'settings!io.ox/calendar',
    'less!io.ox/calendar/style'
], function (ext, extensions, calAPI, folderAPI, userAPI, resourceAPI, coreUtil, util, contactsUtil, ModalDialog, gt, settings) {

    'use strict';

    var INDEX = 0;

    function openDetails(e) {
        e.preventDefault();
        e.data.icon.toggleClass('fa-angle-right fa-angle-down');
        e.data.content.toggle(!e.data.icon.hasClass('fa-angle-right'));

        var baton = e.data.baton;
        if (!!e.data.content.children().length) return;
        // there is no folder given for appointments where the user is not invited, so just use the data available
        if (!baton.data.folder_id) {
            ext.point('io.ox/calendar/conflicts/details').invoke('draw', e.data.content.empty(), ext.Baton.ensure(baton.data));
            e.data.content.show();
            return;
        }
        calAPI.get(baton.data).done(function (appointment) {
            // we don't show details for private appointments in shared/public folders (see bug 37971)
            var folder = folderAPI.pool.getModel(baton.data.folder_id);
            if (appointment.private_flag && appointment.created_by !== ox.user_id && !folderAPI.is('private', folder)) return;
            appointment.nohalo = true;
            ext.point('io.ox/calendar/conflicts/details').invoke('draw', e.data.content.empty(), ext.Baton.ensure(appointment));
            e.data.content.show();
        });
    }

    ext.point('io.ox/calendar/conflicts').extend({
        index: INDEX += 100,
        id: 'subject',
        draw: extensions.h2
    });

    ext.point('io.ox/calendar/conflicts').extend({
        index: INDEX += 100,
        id: 'datetime',
        draw: extensions.datetime
    });

    function getConflictName(participant) {
        if (participant.type === 3) {
            return resourceAPI.get({ id: participant.id }).then(function (resource) {
                return $('<span class="resource-link">').text(resource.display_name).html();
            });

        // internal user
        } else if (participant.type === 1) {
            return userAPI.get({ id: participant.id }).then(function (user) {
                return coreUtil.renderPersonalName({ html: contactsUtil.getFullName(user, true) }, participant).html();
            });
        }
        return $.when();
    }

    ext.point('io.ox/calendar/conflicts').extend({
        index: INDEX += 100,
        id: 'conflicts',
        draw: function (baton) {
            if (!baton.data.participants) return;
            var node = $('<div class="conflicts">').text(gt('Conflicts:') + ' ');

            $.when.apply($, _(baton.data.participants).map(getConflictName)).then(function () {
                node.append([].slice.call(arguments).join('<span class="delimiter">\u00A0\u2022 </span>'));
            });

            this.append(node);
        }
    });

    INDEX = 0;

    ext.point('io.ox/calendar/conflicts/details').extend({
        index: INDEX += 100,
        id: 'location',
        draw: extensions.locationDetail
    });

    ext.point('io.ox/calendar/conflicts/details').extend({
        index: INDEX += 100,
        id: 'note',
        draw: extensions.note
    });

    ext.point('io.ox/calendar/conflicts/details').extend({
        index: INDEX += 100,
        id: 'participants',
        draw: function (baton) {
            var node = $('<div>');
            require(['io.ox/participants/detail'], function (ParticipantsView) {
                var pView = new ParticipantsView(baton, {
                    summary: false, inlineLinks: false, halo: false
                });
                node.append(pView.draw());
            });
            this.append(node);
        }
    });

    ext.point('io.ox/calendar/conflicts/details').extend({
        index: INDEX += 100,
        id: 'list',
        draw: function (baton) {
            var node = $('<table class="details-table">');
            ext.point('io.ox/calendar/conflicts/details/list').invoke('draw', node, baton);
            this.append(node);
        }
    });

    INDEX = 0;

    ext.point('io.ox/calendar/conflicts/details/list').extend({
        index: INDEX += 100,
        id: 'organizer',
        draw: function (baton) {
            baton.organizerNode = $('<span>');
            extensions.organizer.bind(this)(baton);
        }
    });

    ext.point('io.ox/calendar/conflicts/details/list').extend({
        index: INDEX += 100,
        id: 'shownAs',
        draw: extensions.shownAs
    });

    ext.point('io.ox/calendar/conflicts/details/list').extend({
        index: INDEX += 100,
        id: 'folder',
        draw: extensions.folder
    });

    ext.point('io.ox/calendar/conflicts/details/list').extend({
        index: INDEX += 100,
        id: 'created',
        draw: extensions.created
    });

    ext.point('io.ox/calendar/conflicts/details/list').extend({
        index: INDEX += 100,
        id: 'modified',
        draw: extensions.modified
    });

    function drawList(conflicts) {
        return _(conflicts).sortBy('start_date').map(function (conflict) {
            var baton = ext.Baton.ensure(conflict),
                summary = $('<div class="conflict-summary">'),
                details = $('<div class="conflict-details">').hide(),
                icon = $('<i class="fa fa-angle-right" aria-hidden="true">'),
                toggle = $('<a href="#" role="button" class="detail-toggle">').attr('title', gt('Show appointment details')).append(icon),
                li = $('<li>').append(toggle, summary, details);

            // use same setting as schedulingview (freeBusyStrict) to decide if we show infos about appointments the user is not invited too
            if (settings.get('freeBusyStrict', true) && conflict.created_by !== ox.user_id && _.isUndefined(conflict.title)) {
                toggle.remove();
                details.remove();
            } else {
                summary.addClass('pointer');
                li.on('click', '.conflict-summary, .detail-toggle', { icon: icon, baton: baton, content: details }, openDetails);
            }

            ext.point('io.ox/calendar/conflicts').invoke('draw', summary, baton);
            return li;
        });
    }

    return {

        dialog: function (conflicts) {
            return new ModalDialog({ title: gt('Conflicts detected'), width: 640 })
                .build(function () {
                    // look for hard conflicts
                    var hardConflict = !!_.find(conflicts, function (conflict) { return conflict.hard_conflict === true; });

                    // additional header
                    this.$header.append(
                        $('<div class="modal-subtitle">').text(gt('The new appointment conflicts with existing appointments.'))
                    );
                    // conflicting resources cannot be ignored
                    if (hardConflict) {
                        this.$body.append(
                            $('<div class="alert alert-info hard-conflict">').text(gt('Conflicts with resources cannot be ignored'))
                        );
                    }
                    // conflicting appointments
                    this.$body.append($('<ul class="list-unstyled conflict-overview calendar-detail">').append(drawList(conflicts)));
                    // cancel button
                    this.addCancelButton();
                    // ignore button
                    if (!hardConflict) this.addButton({ action: 'ignore', className: 'btn-primary', label: gt('Ignore conflicts'), placement: 'right' });
                }).open();
        },

        drawHeader: function () {
            return $('<h4 class="text-error">')
                .text(gt('Conflicts detected'))
                .add($('<div class="modal-subtitle">').text(gt('The new appointment conflicts with existing appointments.')));
        }

    };
});
