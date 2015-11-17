/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2015 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/onboarding/clients/wizard', [
    'io.ox/core/tk/wizard',
    'gettext!io.ox/core/onboarding',
    'less!io.ox/onboarding/clients/style'
], function (Wizard, gt) {

    'use strict';

    // you can store any data you want; only 'id' is mandatory
    Wizard.registry.add({ id: 'client-onboarding', title: gt('Client onboarding'), type: 'onboarding' }, function () {

        new Wizard({ model: new Backbone.Model({ platform: null, device: null, module: null }) })
        .step({ next: false, width: 'auto' })
            .title(gt('Select your platform'))
            .on('before:show', drawPlatforms)
            .end()
        .step({ next: false, width: 'auto' })
            .title(gt('Select your device'))
            .on('before:show', drawDevices)
            .end()
        .step({ next: false, width: 'auto' })
            .title(gt('What do you want to use on your device?'))
            .on('before:show', drawModules)
            .end()
        .step({ next: false })
            .title('Lorem ipsum')
            .content('...')
            .end()
        .start();
    });

    //
    // Meta data
    //

    // fixed set of modules for development purposes
    var MODULES = ['mail', 'contacts', 'calendar', 'drive'];

    var meta = {

        platforms: {
            android: {
                title: 'Android',
                icon: 'fa-android',
                devices: ['android-phone', 'android-tablet']
            },
            apple: {
                title: 'Apple',
                icon: 'fa-apple',
                devices: ['iphone', 'ipad', 'mac']
            },
            windows: {
                title: 'Windows',
                icon: 'fa-windows',
                devices: ['windows-phone', 'windows-pc']
            }
        },

        devices: {
            'android-phone': {
                title: gt('Smartphone'), icon: 'fa-mobile', modules: MODULES
            },
            'android-tablet': {
                title: gt('Tablet'), icon: 'fa-mobile', modules: MODULES
            },
            'iphone': {
                title: gt('iPhone'), icon: 'fa-mobile', modules: MODULES
            },
            'ipad': {
                title: gt('iPad'), icon: 'fa-tablet', modules: MODULES
            },
            'mac': {
                title: gt('Mac'), icon: 'fa-desktop', modules: MODULES
            },
            'windows-phone': {
                title: gt('Windows Phone'), icon: 'fa-mobile', modules: MODULES
            },
            'windows-pc': {
                title: gt('Windows PC'), icon: 'fa-desktop', modules: MODULES
            }
        },

        modules: {
            mail: {
                title: gt('EMail'),
                icon: 'fa-envelope'
            },
            contacts: {
                title: gt('Contacts'),
                icon: 'fa-book'
            },
            calendar: {
                title: gt('Calendar'),
                icon: 'fa-calendar'
            },
            drive: {
                title: gt('Files'),
                icon: 'fa-file'
            }
        }
    };

    //
    // Helper: draw options
    //

    function drawOptions(type, list) {
        return $('<ul class="onboarding-options">').append(function () {
            return _(list).map(function (item, id) {
                return $('<li>').append(
                    $('<a href="#" tabindex="1">').attr('data-' + type, id).append(
                        $('<i class="icon fa">').addClass(item.icon),
                        $('<div class="title">').text(item.title)
                    )
                );
            });
        });
    }

    //
    // Platform
    //

    function onSelectPlatform(e) {
        e.preventDefault();
        var platform = $(e.currentTarget).data('platform');
        this.getModel().set('platform', platform);
        this.trigger('next');
    }

    function getPlatforms() {
        return meta.platforms;
    }

    function drawPlatforms() {
        this.$('.wizard-content').empty().append(
            drawOptions('platform', getPlatforms())
            .on('click', 'a', onSelectPlatform.bind(this))
        );
    }

    //
    // Device
    //

    function onSelectDevice(e) {
        e.preventDefault();
        var device = $(e.currentTarget).data('device');
        this.getModel().set('device', device);
        this.trigger('next');
    }

    function getDevices(platform) {
        return _.object(
            meta.platforms[platform].devices,
            _(meta.platforms[platform].devices).map(function (id) {
                return meta.devices[id];
            })
        );
    }

    function drawDevices() {
        var platform = this.getModel().get('platform');
        this.$('.wizard-content').empty().append(
            drawOptions('device', getDevices(platform))
            .on('click', 'a', onSelectDevice.bind(this))
        );
    }

    //
    // Module
    //

    function onSelectModule(e) {
        e.preventDefault();
        var module = $(e.currentTarget).data('module');
        this.getModel().set('module', module);
        this.trigger('next');
    }

    function getModules(device) {
        return _.object(
            meta.devices[device].modules,
            _(meta.devices[device].modules).map(function (id) {
                return meta.modules[id];
            })
        );
    }

    function drawModules() {
        var device = this.getModel().get('device');
        this.$('.wizard-content').empty().append(
            drawOptions('module', getModules(device))
            .on('click', 'a', onSelectModule.bind(this))
        );
    }

    return Wizard;
});
