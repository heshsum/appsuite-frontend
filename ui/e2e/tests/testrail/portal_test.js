/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Daniel Pondruff <daniel.pondruff@open-xchange.com>
 */
/// <reference path="../../steps.d.ts" />
const expect = require('chai').expect;

Feature('testrail - portal').tag('6');

Before(async function (users) {
    await users.create();
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

Scenario('[C7471] Open items via portal-tile', async function (I, users) {
    // TODO: Need to add Appointment, latest file(upload?)
    const moment = require('moment');
    let testrailID = 'C7471';
    let testrailName = 'Open items via portal-tile';
    await I.haveMail({
        from: [[users[0].userdata.display_name, users[0].userdata.primaryEmail]],
        sendtype: 0,
        subject: testrailID + ' - ' + testrailName,
        to: [[users[0].userdata.display_name, users[0].userdata.primaryEmail]]
    });
    const taskDefaultFolder = await I.getDefaultFolder('tasks', { user: users[0] });
    const task = {
        title: testrailID,
        folder_id: taskDefaultFolder,
        note: testrailName,
        full_time: true,
        notification: true,
        private_flag: false,
        timezone: 'Europe/Berlin',
        start_time: moment().valueOf(),
        end_time: moment().add(2, 'days').valueOf(),
        days: 2
    };
    I.createTask(task, { user: users[0] });


    const contact = {
        display_name: '' + testrailID + ', ' + testrailID + '',
        folder_id: await I.getDefaultFolder('contacts', { user: users[0] }),
        first_name: testrailID,
        last_name: testrailID,
        birthday: moment().add(2, 'days').valueOf()

    };
    I.createContact(contact, { user: users[0] });

    I.login('app=io.ox/portal', { user: users[0] });
    I.waitForVisible('.io-ox-portal-window');

    //Verifiy Inbox Widget
    I.waitForElement('.widget[aria-label="Inbox"] .item', 5);
    I.click('.item', '.widget[aria-label="Inbox"]');
    I.waitForElement('.io-ox-sidepopup', 5);
    I.waitForText(testrailID + ' - ' + testrailName, 5, '.io-ox-sidepopup-pane .subject');
    I.waitForText(users[0].userdata.display_name, 5, '.io-ox-sidepopup-pane .person-from');
    I.waitForText(users[0].userdata.primaryEmail, 5, '.io-ox-sidepopup-pane .address');
    I.click('.item', '.widget[aria-label="Inbox"]');
    I.waitForDetached('.io-ox-sidepopup', 5);

    //Verify Tasks Widget 
    I.waitForElement('.widget[aria-label="My tasks"] .item', 5);
    I.click('.item', '.widget[aria-label="My tasks"]');
    I.waitForElement('.io-ox-sidepopup', 5);
    I.waitForText(testrailID, 5, '.io-ox-sidepopup-pane .tasks-detailview .title');
    I.waitForText(testrailName, 5, '.io-ox-sidepopup-pane .tasks-detailview .note');
    I.click('.item', '.widget[aria-label="My tasks"]');
    I.waitForDetached('.io-ox-sidepopup', 5);

    //Verify Birthday
    I.waitForElement('.widget[aria-label="Birthdays"] .item', 5);
    I.click('.item', '.widget[aria-label="Birthdays"]');
    I.waitForElement('.io-ox-sidepopup', 5);
    I.waitForText(testrailID + ', ' + testrailID, 5, '.io-ox-sidepopup-pane .birthday .name');
    I.waitForText(moment().add(2, 'days').format('M/D/YYYY'), 5, '.io-ox-sidepopup-pane .birthday .date');
    I.waitForText('In 2 days', 5, '.io-ox-sidepopup-pane .birthday .distance');
    I.click('.item', '.widget[aria-label="Birthdays"]');
    I.waitForDetached('.io-ox-sidepopup', 5);
    I.logout();
});
