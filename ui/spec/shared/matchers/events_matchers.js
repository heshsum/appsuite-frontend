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
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */
if (jasmine) {
    beforeEach(function () {
        this.addMatchers({
            toTrigger: function (eventName) {
                var spy = sinon.spy();

                this.spec.after(function () {
                    expect(spy).toHaveBeenCalledOnce();
                });

                this.actual.on(eventName, spy);
                return true;
            },
            toHaveFocus: function () {
                var actual = this.actual;
                if (this.actual instanceof jQuery) actual = this.actual.get(0);
                if (actual === document.activeElement) return true;
                return false;
            }
        });
    });
}