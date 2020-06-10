/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Ejaz Ahmed <ejaz.ahmed@open-xchange.com>
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 *
 */

/// <reference path="../../steps.d.ts" />
Feature('General > User feedback');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C125002] Enable user feedback dialog', function (I, mail, dialogs) {
    I.login();
    mail.waitForApp();
    I.waitForVisible('~Feedback');
    I.click('~Feedback');
    dialogs.waitForVisible();
    I.see('Please rate the following application');
});

Scenario('[C125004] App aware user feedback', function (I, mail, drive, contacts, calendar, portal, tasks, dialogs) {

    // Check if 'appType' is the value selected by default
    function testFeedback(appType = 'general') {
        I.waitForVisible('~Feedback');
        I.click('~Feedback');
        dialogs.waitForVisible();
        I.waitForText('Please rate the following application', 5, dialogs.locators.body);
        I.waitForValue('.feedback-select-box', appType);
        dialogs.clickButton('Cancel');
        I.waitForDetached('.modal-dialog');
    }

    I.login('app=io.ox/mail');
    mail.waitForApp();
    testFeedback('io.ox/mail');

    I.openApp('Drive');
    drive.waitForApp();
    testFeedback('io.ox/files');

    I.openApp('Address Book');
    contacts.waitForApp();
    testFeedback('io.ox/contacts');

    I.openApp('Calendar');
    calendar.waitForApp();
    testFeedback('io.ox/calendar');

    I.openApp('Portal');
    portal.waitForApp();
    testFeedback();

    I.openApp('Tasks');
    tasks.waitForApp();
    testFeedback();

});

Scenario('[C125005] Provide user feedback', function (I, mail, dialogs) {

    const appArr = ['Mail', 'General', 'Calendar', 'Address Book', 'Drive'];
    const giveFeedback = (app) => {
        I.click('~Feedback');
        dialogs.waitForVisible();
        I.waitForText('Please rate the following application:', 5, dialogs.locators.body);
        I.see(app); // check if app is in options dropdown
        I.selectOption('.feedback-select-box', app);
        I.click(locate('.star-rating label').at(getRandom()));
        I.fillField('.feedback-note', 'It is awesome');
        dialogs.clickButton('Send');
        I.waitForText('Thank you for your feedback');
        I.waitForDetached('.modal-dialog');
    };
    const getRandom = () => {
        return Math.floor(Math.random() * (5)) + 1;
    };

    I.login();
    mail.waitForApp();
    I.waitForVisible('~Feedback');
    //Open Feedback dialog and rate each app in turn
    appArr.forEach(giveFeedback);

    // Open Feedback dialog and try to send feedback without rating
    I.click('~Feedback');
    dialogs.waitForVisible();
    dialogs.clickButton('Send');
    I.waitForText('Please select a rating.');

});

Scenario('[C125003] Disable user feedback dialog', async function (I) {

    // var userA = users[0], userB = users[1];
    // await I.haveCapability('feedback', userA);
    // await I.dontHaveCapability('feedback', userB);

    I.login('app=io.ox/mail');
    I.openApp('Mail');
    I.waitForText('No message selected');
    I.waitForText('Feedback');
    I.logout();

    I.amOnPage('ui');
    // dirty hack until dontHaveCapability works
    I.executeScript(function () { document.cookie = 'cap=-feedback; path=/'; });
    I.refreshPage();
    I.login('app=io.ox/mail');
    I.waitForText('No message selected');
    I.wait(1);
    I.dontSee('Feedback');
});
