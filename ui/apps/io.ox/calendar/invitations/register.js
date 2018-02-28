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

define('io.ox/calendar/invitations/register', [
    'io.ox/backbone/disposable',
    'io.ox/core/extensions',
    'io.ox/core/http',
    'io.ox/calendar/model',
    'io.ox/calendar/util',
    'settings!io.ox/calendar',
    'gettext!io.ox/calendar/main',
    'io.ox/core/notifications',
    'less!io.ox/calendar/style'
], function (DisposableView, ext, http, models, calendarUtil, calendarSettings, gt, notifications) {

    'use strict';

    var i18n = {
        'accept': gt('Accept'),
        'accept_and_replace': gt('Accept changes'),
        'accept_and_ignore_conflicts': gt('Accept'),
        'accept_party_crasher': gt('Add new participant'),
        'create': gt('Accept'),
        'update': gt('Accept changes'),
        'delete': gt('Delete'),
        'declinecounter': gt('Reject changes'),
        'tentative': gt('Tentative'),
        'decline': gt('Decline'),
        'ignore': gt('Ignore')
    };

    var buttonClasses = {
        'accept': 'btn-success accept',
        'accept_and_replace': 'btn-success',
        'accept_and_ignore_conflicts': 'btn-success ignore',
        'accept_party_crasher': '',
        'create': '',
        'update': 'btn-success',
        'delete': '',
        'declinecounter': 'btn-danger',
        'tentative': 'btn-warning',
        'decline': 'btn-danger',
        'ignore': ''
    };

    var success = {
        'accept': gt('You have accepted the appointment'),
        'accept_and_replace': gt('Changes have been saved'),
        'accept_and_ignore_conflicts': gt('You have accepted the appointment'),
        'accept_party_crasher': gt('Added the new participant'),
        'create': gt('You have accepted the appointment'),
        'update': gt('The appointment has been updated'),
        'delete': gt('The appointment has been deleted'),
        'declinecounter': gt('The changes have been rejected'),
        'tentative': gt('You have tentatively accepted the appointment'),
        'decline': gt('You have declined the appointment')
    };

    var successInternal = {
        'accept': gt('You have accepted the appointment'),
        'decline': gt('You have declined the appointment'),
        'tentative': gt('You have tentatively accepted the appointment')
    };

    var priority = ['update', 'ignore', 'create', 'delete', 'decline', 'tentative', 'accept', 'declinecounter', 'accept_and_replace', 'accept_and_ignore_conflicts', 'accept_party_crasher'];

    //
    // Basic View
    // expects data to be in the this.model variable and works only on the new events model
    // if other data (e.g. tasks) are used, overwrite according functions
    //
    var BasicView = DisposableView.extend({

        className: 'itip-item',

        events: {
            'click .show-details': 'onShowDetails',
            'click .itip-actions button': 'onAction',
            'keydown': 'onKeydown'
        },

        initialize: function (options) {
            this.options = _.extend({}, options);

            this.mailModel = options.mailModel;
            this.module = options.module;
            this.api = options.api;
            this.util = options.util;
            this.settings = options.settings;
            this.AlarmsView = options.AlarmsView;

            if (this.AlarmsView) {
                this.alarmsModel = new Backbone.Model(this.model.toJSON());
                this.alarmsModel.set('alarms', this.alarmsModel.get('alarms') || calendarUtil.getDefaultAlarms(this.alarmsModel));
            }

            this.listenTo(this.model, 'change:flags change:participants', this.render);
        },

        onKeydown: function (e) {
            // temporary fix; bootstrap a11y plugin causes problems here (space key)
            e.stopPropagation();
        },

        getFullModel: function () {
            return this.api.get(this.model.attributes);
        },

        onShowDetails: function (e) {
            e.preventDefault();
            var self = this;
            ox.load(['io.ox/core/tk/dialogs', 'io.ox/calendar/view-detail']).done(function (dialogs, viewDetail) {
                new dialogs.SidePopup({ tabTrap: true }).show(e, function (popup) {
                    popup.busy();
                    self.getFullModel().done(function (fullModel) {
                        popup.idle().append(viewDetail.draw(fullModel, { noFolderCheck: true }));
                    });
                });
            });
        },

        renderScaffold: function () {
            return this.$el.append(
                $('<div class="headline">').append(
                    $('<span>').text(this.getInfoText()), $.txt('. '),
                    $('<a href="#" role="button" class="show-details">').text(this.getLinkText())
                ),
                $('<div class="itip-details">'),
                $('<div class="itip-annotations">'),
                $('<div class="itip-changes">'),
                $('<div class="itip-comment">'),
                $('<div class="itip-controls">')
            );
        },

        getInfoText: function () {
            return gt('This email contains an appointment');
        },

        getLinkText: function () {
            return gt('Show appointment details');
        },

        renderConfirmation: function () {
            var status = this.getConfirmationStatus(), // NEEDS-ACTION ACCEPTED DECLINED TENTATIVE
                message = '';

            if (this.isOrganizer()) {
                message = gt('You are the organizer');
                return $('<div class="confirmation-status">').addClass('organizer').text(message);
            }

            switch (status) {
                case 'ACCEPTED':
                    message = this.getAcceptedMessage();
                    break;
                case 'DECLINED':
                    message = this.getRejectedMessage();
                    break;
                case 'TENTATIVE':
                    message = this.getTentativeMessage();
                    break;
                default:

            }

            if (message) return $('<div class="confirmation-status">').addClass(status.toLowerCase()).text(message);
            return $();
        },

        getAcceptedMessage: function () {
            return gt('You have accepted this appointment');
        },

        getRejectedMessage: function () {
            return gt('You declined this appointment');
        },

        getTentativeMessage: function () {
            return gt('You tentatively accepted this invitation');
        },

        isOrganizer: function () {
            return this.model.has('organizer') && this.model.get('organizer').entity === ox.user_id;
        },

        getConfirmationStatus: function () {
            return this.util.getConfirmationStatus(this.model);
        },

        renderSummary: function () {

            var dateStrings = this.getDateTimeIntervalMarkup(),
                recurrenceString = calendarUtil.getRecurrenceString(this.model),
                title = this.getTitle(),
                separator = title ? $.txt(', ') : $.txt('');

            this.$el.find('.itip-details').append(
                $('<b>').text(title), separator,
                $('<span class="day">').append(
                    $.txt(dateStrings.dateStr),
                    $.txt(' '),
                    $.txt(dateStrings.timeStr),
                    $.txt(recurrenceString && recurrenceString.length ? ' \u2013 ' + recurrenceString : '')
                ),
                // confirmation
                this.renderConfirmation()
            );
        },

        getTitle: function () {
            this.model.get('summary');
        },

        getDateTimeIntervalMarkup: function () {
            return this.util.getDateTimeIntervalMarkup(this.model.attributes, { output: 'strings', zone: moment().tz() });
        },

        renderAnnotations: function () {
        },

        renderChanges: function () {
        },

        renderReminder: function () {
            if (!this.AlarmsView || !this.alarmsModel) return;
            var alarmsViewInstance = new this.AlarmsView({ model: this.alarmsModel });
            this.$el.find('.itip-actions').before(
                $('<div class="itip-reminder">').append(
                    $('<legend>').text(gt('Reminder')),
                    alarmsViewInstance.render().$el
                )
            );
            // custom event that is triggered when the view is actually appended to the dom
            this.on('appended', alarmsViewInstance.reactToResize);
            var callback = _(alarmsViewInstance.reactToResize).bind(alarmsViewInstance);
            $(window).on('resize', callback);
            alarmsViewInstance.on('dispose', function () {
                $(window).off('resize', callback);
            });
        },

        getActions: function () {
            if (this.getConfirmationStatus() === 'ACCEPTED') return [];
            return ['decline', 'tentative', 'accept'];
        },

        getButtons: function (actions) {
            return _(priority)
                .chain()
                .filter(function (action) {
                    return _(actions).contains(action);
                })
                .map(function (action) {
                    return $('<button type="button" class="btn btn-default">')
                        .attr('data-action', action)
                        .addClass(buttonClasses[action])
                        .text(i18n[action]);
                })
                .value();
        },

        getConfirmationSelector: function (status) {
            if (status === 'ACCEPTED') return 'button.btn-success.accept';
            if (status === 'DECLINED') return 'button.btn-danger';
            if (status === 'TENTATIVE') return 'button.btn-warning';
            return '';
        },

        disableCurrentButton: function () {

            if (this.supportsComment()) return;

            var status = this.getConfirmationStatus(),
                selector = this.getConfirmationSelector(status);
            // disable buttons - don't know why we have an array of appointments but just one set of buttons
            // so, let's use the first one
            this.$('.itip-actions').find(selector).addClass('disabled').prop('disabled', true);
        },

        supportsComment: function () {
            // show comment field if we have a accept, tentative, or decline button
            return this.$('[data-action="accept"], [data-action="tentative"], [data-action="decline"]').length > 0;
        },

        getUserComment: function () {
            return this.$el.find('.itip-comment input').val();
        },

        renderComment: function () {
            if (!this.supportsComment()) return;
            this.$el.find('.itip-comment').append(
                $('<input type="text" class="form-control" data-property="comment">')
                .attr('placeholder', gt('Comment'))
                .val(this.util.getConfirmationMessage(this.model.attributes))
            );
        },

        render: function () {

            // do not render if busy
            if (this.$el.hasClass('io-ox-busy')) return;

            this.$el.empty();
            if (this.$el.is(':hidden')) this.$el.fadeIn(300);

            var actions = this.getActions(), buttons;

            this.renderScaffold();
            this.renderAnnotations();

            if (!this.model) {
                // remove "Show appointment" link
                this.$el.find('.show-details').remove();
                return this;
            }

            this.renderSummary();
            this.renderChanges();

            // get standard buttons
            buttons = this.getButtons(actions);
            if (buttons.length === 0) return this;
            // use doesn't need any controls to "ignore" the message
            if (actions.length === 1 && actions[0] === 'ignore') return this;

            this.$el.find('.itip-controls').append(
                $('<div class="itip-actions">').append(buttons)
            );

            this.disableCurrentButton();
            this.renderComment();
            this.renderReminder();

            return this;
        }

    });

    //
    // External invitations
    //

    var ExternalView = BasicView.extend({

        getFullModel: function () {
            return $.when(this.model);
        },

        onAction: function (e) {

            e.preventDefault();

            var action = $(e.currentTarget).attr('data-action'), self = this,
                doConflictCheck = action !== 'decline',
                imip = this.imip;

            function performConfirm() {
                http.PUT({
                    module: 'chronos/itip',
                    params: {
                        action: action,
                        dataSource: 'com.openexchange.mail.ical',
                        descriptionFormat: 'html',
                        message: self.getUserComment()
                    },
                    data: {
                        'com.openexchange.mail.conversion.fullname': imip.mail.folder_id,
                        'com.openexchange.mail.conversion.mailid': imip.mail.id,
                        'com.openexchange.mail.conversion.sequenceid': imip.id
                    }
                })
                .then(
                    function done() {
                        // api refresh
                        var refresh = require(['io.ox/calendar/api']).then(
                            function (api) {
                                api.refresh();
                                if (self.options.yell !== false) {
                                    notifications.yell('success', success[action]);
                                }
                            });

                        if (self.settings.get('deleteInvitationMailAfterAction', false)) {
                            // remove mail
                            require(['io.ox/mail/api'], function (api) {
                                api.remove([self.mailModel.toJSON()]);
                            });
                        } else {
                            // repaint only if there is something left to repaint
                            refresh.then(function () {
                                // if the delete action was succesfull we don't need the button anymore, see Bug 40852
                                if (action === 'delete') {
                                    self.model.set('actions', _(self.model.get('actions')).without('delete'));
                                }
                                self.repaint();
                            });
                        }
                    },
                    function fail(e) {
                        notifications.yell(e);
                        self.repaint();
                    }
                );
            }

            ox.load(['io.ox/calendar/actions/change-confirmation']).done(function (action) {
                action(self.imip, {
                    api: {
                        checkConflicts: function () {
                            var conflicts = [];
                            // no need to check if appointment was declined
                            if (doConflictCheck) {
                                _(self.model.get('changes')).each(function (change) {
                                    if (change.conflicts) conflicts = conflicts.concat(change.conflicts);
                                });
                            }
                            return $.when(conflicts);
                        }
                    }
                }).done(performConfirm).fail(function (err) {
                    if (err) notifications.yell(err);
                });
            });
        },

        initialize: function (options) {
            BasicView.prototype.initialize.call(this, options);
            this.options = _.extend({}, options);
            this.imip = options.imip;
            this.$el.hide();
        },

        getActions: function () {
            return this.options.actions;
        },

        renderAnnotations: function () {
            var node = this.$el.find('.itip-annotations');
            if (!this.options.annotations) return;
            _(this.options.annotations).each(function (annotation) {
                node.append(
                    $('<div class="annotation">').text(annotation.message)
                );
            });
        },

        renderChanges: function () {
            var node = this.$el.find('.itip-changes');
            if (!this.options.diffDescription) return;
            _(this.options.diffDescription).each(function (description) {
                node.append($('<p>').html(description));
            });
        },

        repaint: function () {
            this.options.container.analyzeIMIPAttachment(this.imip)
                .done(function (list) {
                    var data = list[0],
                        change = data.changes[0],
                        eventData = change.deletedEvent || change.newEvent || change.currentEvent;
                    if (!eventData) return;
                    this.model.set(eventData);
                    this.render();
                }.bind(this));
        }

    });

    //
    //  Internal invitations
    //

    var InternalView = BasicView.extend({

        initialize: function (options) {
            BasicView.prototype.initialize.call(this, options);
            this.listenTo(this.model, 'change:headers', this.render);
            this.cid = options.cid;
            this.$el.hide();
            this.$el.attr({ 'data-type': this.type, 'data-cid': this.cid });
        }

    });

    var InternalAppointmentView = InternalView.extend({

        onAction: function (e) {

            var self = this,
                action = $(e.currentTarget).attr('data-action'),
                hash = { accept: 'ACCEPTED', tentative: 'TENTATIVE', decline: 'DECLINED' },
                comment = this.getUserComment();

            function performConfirm(checkConflicts) {
                var attendee = _.extend({}, self.previousConfirmation, {
                    partStat: hash[action],
                    comment: comment
                });
                if (comment) attendee.comment = comment;
                self.api.confirm({
                    attendee: attendee,
                    id: self.model.get('id'),
                    folder: self.model.get('folder'),
                    alarms: self.alarmsModel.get('alarms')
                }, { checkConflicts: !!checkConflicts })
                .then(function success(data) {
                    if (data && data.conflicts) {
                        ox.load(['io.ox/calendar/conflicts/conflictList']).done(function (conflictView) {
                            conflictView.dialog(data.conflicts)
                                .on('cancel', function () {
                                    self.$el.idle();
                                    self.render();
                                })
                                .on('ignore', function () {
                                    performConfirm(false);
                                });
                        });
                        return;
                    }

                    if (calendarSettings.get('deleteInvitationMailAfterAction', false)) {
                        // remove mail
                        if (self.options.yell !== false) {
                            notifications.yell('success', successInternal[action]);
                        }
                        require(['io.ox/mail/api'], function (api) {
                            api.remove([self.mailModel.toJSON()]);
                        });
                    } else {
                        // update well
                        self.$el.idle();
                        self.render();
                    }
                }, function fail() {
                    self.$el.idle().hide();
                    notifications.yell('error', gt('Failed to update confirmation status; most probably the appointment has been deleted.'));
                });
            }

            self.$el.busy(true);
            performConfirm(true);
        }

    });

    var InternalTaskView = InternalView.extend({

        initialize: function (opt) {
            InternalView.prototype.initialize.call(this, opt);
            // check if the user participates
            this.isParticipant = !!_(this.model.get('participants') || []).findWhere({ id: ox.user_id });
        },

        onShowDetails: function (e) {
            e.preventDefault();
            var self = this;
            ox.load(['io.ox/core/tk/dialogs', 'io.ox/tasks/view-detail']).done(function (dialogs, viewDetail) {
                new dialogs.SidePopup({ tabTrap: true }).show(e, function (popup) {
                    popup.append(viewDetail.draw(self.model.toJSON()));
                });
            });
        },

        getTitle: function () {
            return this.model.get('title');
        },

        isOrganizer: function () {
            return this.model.get('created_by') === ox.user_id;
        },

        getConfirmationStatus: (function () {
            var confirmations = ['NEEDS-ACTION', 'ACCEPTED', 'DECLINED', 'TENTATIVE'];
            return function () {
                var index = this.util.getConfirmationStatus(this.model.attributes);
                if (index >= 0 && index < confirmations.length) return confirmations[index];
                return 'NEEDS-ACTION';
            };
        }()),

        getInfoText: function () {
            return gt('This email contains a task');
        },

        getLinkText: function () {
            return gt('Show task details');
        },

        getAcceptedMessage: function () {
            return gt('You have accepted this task');
        },

        getRejectedMessage: function () {
            return gt('You declined this task');
        },

        getTentativeMessage: function () {
            return gt('You tentatively accepted this task');
        },

        renderReminder: function () {
            if (!this.isParticipant) return;
            var view = this;
            this.$el.find('.itip-actions').before(
                $('<div class="itip-reminder inline">').append(
                    $('<label class="control-label" for="reminderSelect">').text(gt('Reminder')),
                    $('<div class="controls">').append(
                        $('<select id="reminderSelect" class="reminder-select form-control" data-property="reminder">')
                        .append(function () {
                            var self = $(this),
                                options = view.util.getReminderOptions();
                            _(options).each(function (label, value) {
                                self.append($('<option>', { value: value }).text(label));
                            });
                        })
                        .val(this.getDefaultReminder())
                    )
                )
            );
        },

        renderComment: function () {
            if (!this.isParticipant) return;
            InternalView.prototype.renderComment.call(this);
        },

        getActions: function () {
            if (!this.isParticipant) return [];
            return InternalView.prototype.getActions.call(this);
        },

        getDefaultReminder: function () {
            return parseInt(this.settings.get('defaultReminder', 15), 10);
        },

        onActionSuccess: function (action, updated) {

            var reminder = this.reminder,
                tempdata;

            if (reminder) {
                // don't use whole data object here, because it overwrites the confirmations with it's users attribute
                tempdata = {
                    id: this.model.get('id'),
                    folder_id: this.model.get('folder_id'),
                    alarm: reminder
                };
                if (this.model.has('recurrence_position')) {
                    tempdata.recurrence_position = this.model.get('recurrence_position');
                }
                //tasks use absolute timestamps
                tempdata.alarm = _.utc() + tempdata.alarm;
                this.api.update(tempdata);
            }

            var user = _(this.model.get('users')).findWhere({ id: ox.user_id });
            if (user) {
                user.confirmation = updated;
                this.model.trigger('update update:users', this.model);
            }

            if (calendarSettings.get('deleteInvitationMailAfterAction', false)) {
                // remove mail
                if (this.options.yell !== false) {
                    notifications.yell('success', successInternal[action]);
                }
                require(['io.ox/mail/api'], function (api) {
                    api.remove([this.mailModel.toJSON()]);
                }.bind(this));
            } else {
                // update well
                this.$el.idle();
                this.render();
            }
        },

        onActionFail: function () {
            // appointment or task was deleted in the meantime
            this.$el.idle().hide();
            notifications.yell('error', gt('Failed to update confirmation status; most probably the task has been deleted.'));
        },

        onAction: function (e) {

            var self = this,
                action = $(e.currentTarget).attr('data-action'),
                hash = { accept: 1, decline: 2, tentative: 3 },
                confirmation = hash[action],
                status = this.getConfirmationStatus(),
                accepted = status === 'ACCEPTED',
                comment = this.getUserComment();

            this.reminder = accepted ? false : parseInt(this.$el.find('.reminder-select').val(), 10);

            self.$el.busy(true);

            self.api.confirm({
                folder: this.model.get('folder_id'),
                id: this.model.get('id'),
                data: { confirmation: confirmation, confirmmessage: comment }
            })
            .then(self.onActionSuccess.bind(self, action, confirmation), self.onActionFail.bind(self, action));
        }

    });

    //
    // Container view. Checks mail data and adds internal or external view
    //

    var ItipView = DisposableView.extend({

        initialize: function (options) {
            this.options = _.extend({}, options);
            if (this.model.has('headers')) this.analyzeMail();
            else this.listenToOnce(this.model, 'change:headers', this.analyzeMail);
        },

        analyzeMail: function () {
            if (this.hasIMIPAttachment()) this.processIMIPAttachment();
            else if (this.hasEvent()) this.processEvent();
            else if (this.hasTask()) this.processTask();
        },

        getIMIPAttachment: function () {
            var regex = /text\/calendar.*?method=(.+)/i;
            // loop over attachments to find first attachment with mime-type text/calendar
            return _(this.model.get('attachments')).find(function (attachment) {
                var match = attachment.content_type.match(regex), index, method;
                if (match && match[1].toLowerCase() !== 'publish') {
                    index = match[1].indexOf(';');
                    method = index !== -1 ? match[1].substr(0, index) : match[1];
                    return method.toLowerCase() !== 'publish';
                }
                return false;
            });
        },

        hasIMIPAttachment: function () {
            return !!this.getIMIPAttachment();
        },

        analyzeIMIPAttachment: function (imip) {
            if (!imip || !imip.id) return $.Deferred().reject();

            return http.PUT({
                module: 'chronos/itip',
                params: {
                    action: 'analyze',
                    dataSource: 'com.openexchange.mail.ical',
                    descriptionFormat: 'html',
                    timezone: 'UTC'
                },
                data: {
                    'com.openexchange.mail.conversion.fullname': imip.mail.folder_id,
                    'com.openexchange.mail.conversion.mailid': imip.mail.id,
                    'com.openexchange.mail.conversion.sequenceid': imip.id
                }
            });
        },

        processIMIPAttachment: function () {
            var self = this,
                imip = this.getIMIPAttachment(),
                yell = this.options && this.options.yell;
            imip.mail = { folder_id: this.model.get('folder_id'), id: this.model.get('id') };
            return this.analyzeIMIPAttachment(imip).done(function (list) {
                if (list.length === 0) return;

                var data = list[0], model,
                    change = data.changes ? data.changes[0] : {},
                    eventData = change.deletedEvent || change.newEvent || change.currentEvent;
                if (eventData) model = new models.Model(eventData);
                self.model.set('imipMail', true, { silent: true });
                return require(['io.ox/calendar/api', 'io.ox/calendar/util']).then(function (api, util) {
                    var extView = new ExternalView({
                        model: model,
                        module: 'calendar',
                        api: api,
                        util: util,
                        settings: calendarSettings,
                        actions: data.actions,
                        introduction: change.introduction,
                        diffDescription: change.diffDescription,
                        annotations: data.annotations,
                        imip: imip,
                        container: self,
                        yell: yell,
                        mailModel: self.model
                    });
                    self.$el.append(
                        extView.render().$el
                    );
                    //trigger event so width can be calculated
                    extView.trigger('appended');
                });
            });
        },

        getCid: function () {
            var headers = this.model.get('headers') || {},
                reminder = headers['X-OX-Reminder'],
                module = headers['X-Open-Xchange-Module'];
            if (!reminder || !module) return;
            reminder = reminder.split(/,\s*/);
            return { module: module, folder_id: reminder[1], id: reminder[0] };
        },

        hasEvent: function () {
            var cid = this.getCid();
            if (!cid) return false;
            return cid.module === 'Appointments';
        },

        processEvent: function () {
            var self = this,
                cid = this.getCid(),
                yell = this.options && this.options.yell;
            return require(['io.ox/calendar/api', 'io.ox/calendar/util', 'io.ox/backbone/mini-views/alarms']).then(function (api, util, AlarmsView) {
                return api.resolve(cid.id, true).then(function (model) {
                    var intView = new InternalAppointmentView({
                        model: model,
                        module: 'calendar',
                        api: api,
                        util: util,
                        settings: calendarSettings,
                        AlarmsView: AlarmsView,
                        yell: yell,
                        mailModel: self.model
                    });

                    self.$el.append(
                        intView.render().$el
                    );

                    //trigger event so width can be calculated
                    intView.trigger('appended');
                });
            });
        },

        hasTask: function () {
            var cid = this.getCid();
            if (!cid) return false;
            return cid.module === 'Tasks';
        },

        processTask: function () {
            var self = this,
                cid = this.getCid(),
                yell = this.options && this.options.yell;
            return require(['io.ox/tasks/api', 'io.ox/tasks/util', 'settings!io.ox/tasks']).then(function (api, util, taskSettings) {
                return api.get({ folder: cid.folder_id, id: cid.id }).then(function (task) {
                    var model = new Backbone.Model(task);
                    self.$el.append(
                        new InternalTaskView({
                            model: model,
                            module: 'tasks',
                            api: api,
                            util: util,
                            settings:
                            taskSettings,
                            yell: yell,
                            mailModel: self.model
                        }).render().$el
                    );
                });
            });
        }

    });

    ext.point('io.ox/mail/detail/notifications').extend({
        index: 1000000000000,
        id: 'accept-decline',
        draw: function (baton) {
            var view = new ItipView(_.extend({ model: baton.model }, baton.options));
            this.append(view.render().$el);
        }
    });
});
