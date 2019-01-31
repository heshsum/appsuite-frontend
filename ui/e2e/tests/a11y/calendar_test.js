/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author David Bauer <david.bauer@open-xchange.com>
 */
/// <reference path="../../steps.d.ts" />

const { expect } = require('chai');

Feature('A11y for Calendar App');

Before(async function (users) {
    await users.create();
});

Scenario('Default List view w/o appointments', async function (I) {
    I.haveSetting('io.ox/core//autoOpenNotification', false);
    I.haveSetting('io.ox/core//showDesktopNotifications', false);
    I.haveSetting('io.ox/calendar//showCheckboxes', true);

    I.login('app=io.ox/calendar');
    I.waitForVisible('[data-app-name="io.ox/calendar"]', 5);

    // create in list view for invitation accept
    I.selectFolder('Calendar');
    I.clickToolbar('View');
    I.click('List');
    I.waitForVisible('.io-ox-center.multi-selection-message');

    const currentView = await I.grabAxeReport();
    expect(currentView).to.be.accessible;
});

