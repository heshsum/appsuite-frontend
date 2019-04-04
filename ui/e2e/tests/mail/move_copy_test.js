/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 *
 */

/// <reference path="../../steps.d.ts" />

Feature('Mail move and copy');

Before(async function (I, users) {
    await users.create();
});

After(async function (I, users) {
    await users.removeAll();
});

// TODO: introduce global actors?
const A = {
    check: function (I, subjects, folder) {
        subjects = [].concat(subjects);
        I.selectFolder(folder);
        subjects.forEach(function (subject) {
            I.waitForText(subject, 1, '.leftside .list-view .subject .drag-title');
        });
    },
    clickMoreAction: function (I, toolbar, action) {
        I.click('~More actions', toolbar);
        I.waitForVisible(`[data-action="${action}"]`, 'body > .dropdown');
        I.click(`[data-action="${action}"]`, 'body > .dropdown');
    },
    createFolderInDialog: function (I, folder) {
        I.waitForVisible('.folder-picker-dialog');
        I.click('Create folder', '.folder-picker-dialog');

        I.waitForElement('[data-point="io.ox/core/folder/add-popup"]');
        I.fillField('Folder name', folder);
        I.click('Add');

        I.waitForDetached('[data-point="io.ox/core/folder/add-popup"]');
        I.seeTextEquals(folder, '.folder-picker-dialog .selected .folder-label');
    },
    selectFolderInDialog: function (I, folder) {
        // toogle 'myfolders'
        I.click('[data-id="virtual/myfolders"] .folder-arrow', '.folder-picker-dialog');
        I.waitForElement(`[data-id="default0/INBOX/${folder}"]`, '.folder-picker-dialog');
        I.click(`[data-id="default0/INBOX/${folder}"]`, '.folder-picker-dialog');
        I.waitForElement(`[data-id="default0/INBOX/${folder}"].selected`, '.folder-picker-dialog');
        I.wait(1);
    },
    isEmpty: function (I, folder) {
        I.selectFolder(folder);
        I.seeTextEquals('Empty', '.list-view .notification');
    },
    select: function (I, number) {
        number = number || 1;
        for (var i = 0; i < number; i++) {
            I.click(locate('.list-view').find('.selectable:not(.selected) .list-item-checkmark'));
        }
    }
};

// TODO: introduce global helpers?
const H = {
    fillInbox: async function create(I, user, subjects) {
        [].concat(subjects).forEach(function (subject) {
            I.haveMail({
                attachments: [{
                    content: `<p>${subject}</p>`,
                    content_type: 'text/html',
                    disp: 'inline'
                }],
                from: [[user.get('displayname'), user.get('primaryEmail')]],
                sendtype: 0,
                subject: subject,
                to: [[user.get('displayname'), user.get('primaryEmail')]]
            });
        });
    }
};

Scenario('[C7407] Move mail from inbox to a sub-folder', async function (I, users) {
    let [user] = users,
        folder = 'C7407',
        subject = 'C7407';

    await H.fillInbox(I, user, [subject]);
    await I.haveFolder(folder, 'mail', 'default0/INBOX');

    I.login('app=io.ox/mail');
    I.waitForVisible('.io-ox-mail-window');

    A.select(I, 1);
    A.clickMoreAction(I, '.detail-view-header', 'io.ox/mail/actions/move');
    A.selectFolderInDialog(I, folder);
    I.click('Move', '.folder-picker-dialog');
    I.waitForDetached('.folder-picker-dialog');

    A.isEmpty(I, 'Inbox');
    A.check(I, subject, folder);

    I.logout();
});

Scenario('[C7408] Move several mails from inbox to a sub-folder', async function (I, users) {
    let [user] = users,
        folder = 'C7408',
        subjects = ['C7408-1', 'C7408-2', 'C7408-3'];

    I.haveSetting('io.ox/mail//showCheckboxes', true);
    await H.fillInbox(I, user, subjects);
    await I.haveFolder(folder, 'mail', 'default0/INBOX');

    I.login('app=io.ox/mail');
    I.waitForVisible('.io-ox-mail-window');

    A.select(I, 3);
    A.clickMoreAction(I, '.classic-toolbar-container', 'io.ox/mail/actions/move');
    A.selectFolderInDialog(I, folder);
    I.click('Move', '.folder-picker-dialog');
    I.waitForDetached('.folder-picker-dialog');

    A.isEmpty(I, 'Inbox');
    A.check(I, subjects, folder);

    I.logout();
});

Scenario('[C7409] Copy mail from inbox to a sub-folder', async function (I, users) {
    let [user] = users,
        folder = 'C7409',
        subject = 'C7409';

    await H.fillInbox(I, user, [subject]);
    await I.haveFolder(folder, 'mail', 'default0/INBOX');

    I.login('app=io.ox/mail');
    I.waitForVisible('.io-ox-mail-window');

    A.select(I, 1);
    A.clickMoreAction(I, '.detail-view-header', 'io.ox/mail/actions/copy');
    A.selectFolderInDialog(I, folder);
    I.click('Copy', '.folder-picker-dialog');
    I.waitForDetached('.folder-picker-dialog');

    A.check(I, subject, 'Inbox');
    A.check(I, subject, folder);

    I.logout();
});

Scenario('[C114349] Create folder within move dialog', async function (I, users) {
    let [user] = users,
        folder = 'C114349-move',
        subject = 'C114349-move';

    await H.fillInbox(I, user, [subject]);
    I.login('app=io.ox/mail');
    I.waitForVisible('.io-ox-mail-window');

    A.select(I, 1);
    A.clickMoreAction(I, '.detail-view-header', 'io.ox/mail/actions/move');
    A.createFolderInDialog(I, subject);
    I.click('Move', '.folder-picker-dialog');

    A.isEmpty(I, 'Inbox');
    A.check(I, folder, subject);

    I.logout();
});

Scenario('[C114349] Create folder within copy dialog', async function (I, users) {
    let [user] = users,
        folder = 'C114349-copy',
        subject = 'C114349-copy';

    await H.fillInbox(I, user, [subject]);
    I.login('app=io.ox/mail');
    I.waitForVisible('.io-ox-mail-window');

    A.select(I, 1);
    A.clickMoreAction(I, '.detail-view-header', 'io.ox/mail/actions/copy');
    A.createFolderInDialog(I, subject);
    I.click('Copy', '.folder-picker-dialog');

    A.check(I, folder, 'Inbox');
    A.check(I, folder, subject);

    I.logout();
});
