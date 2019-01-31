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

const excludedElements = [
    ['.search-field']  // Search field does not have a visible label
];

Feature('A11y for Tasks App');

Before(async function (users) {
    await users.create();
});

Scenario('Default List view w/o tasks', async function (I) {
    I.haveSetting('io.ox/core//autoOpenNotification', false);
    I.haveSetting('io.ox/core//showDesktopNotifications', false);
    I.haveSetting('io.ox/tasks//showCheckboxes', true);

    I.login('app=io.ox/tasks');
    I.waitForVisible('[data-app-name="io.ox/tasks"]', 5);

    I.waitForVisible('.summary.empty');

    const currentView = await I.grabAxeReport({ exclude: excludedElements });
    expect(currentView).to.be.accessible;
});
