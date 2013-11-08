/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2011 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/tk/dialogs',
    ['io.ox/core/event',
     'gettext!io.ox/core',
     'less!io.ox/core/tk/dialog.less'
    ], function (Events, gt) {

    'use strict';

    // scaffolds
    var underlay = $('<div class="abs io-ox-dialog-underlay">').hide(),
        popup = $('<div class="io-ox-dialog-popup" tabindex="-1" role="dialog" aria-labelledby="dialog-title">').hide()
            .append(
                $('<div class="modal-header">'),
                $('<div class="modal-body">'),
                $('<div class="modal-footer">')
            );

    var Dialog = function (options) {

        var o = _.extend({
                underlayAction: null,
                defaultAction: null,
                easyOut: true,
                center: true,
                async: false,
                maximize: false,
                top: '50%',
                container: $('body')
            }, options),

            nodes = {
                buttons: [],
                underlay: underlay.clone(),
                popup: popup.clone(),
                wrapper: $('<div>').addClass('abs io-ox-dialog-wrapper')
            },

            lastFocus = $(),
            innerFocus = $(),
            deferred = $.Deferred(),
            isBusy = false,
            self = this,
            data = {},

            keepFocus = function (e) {
                // we have to consider that two popups might be open
                // so we cannot just refocus the current popup
                var insidePopup = $(e.target).closest('.io-ox-dialog-popup').length > 0;
                if (!insidePopup) {
                    if (nodes.popup.is(':visible')) {
                        e.stopPropagation();
                        nodes.popup.focus();
                    }
                }
            },

            close = function () {

                // disable scrollblocker - Bug 29011
                o.container.removeClass('blockscroll');

                self.trigger('close');
                document.removeEventListener('focus', keepFocus, true); // not via jQuery!
                nodes.popup.empty().remove();
                nodes.underlay.remove();
                nodes.wrapper.remove();

                // restore focus
                lastFocus = lastFocus.closest(':visible');
                if (lastFocus.hasClass('dropdown')) {
                    lastFocus.children().first().focus();
                } else {
                    lastFocus.focus();
                }
                // self destruction
                for (var prop in self) {
                    delete self[prop];
                }
                self.close = self.idle = $.noop;
                nodes.header = nodes.body = nodes.footer = null;
                nodes = deferred = self = data = o = null;
            },

            busy = function () {
                nodes.footer
                    .find('input, select, button')
                    .prop('disabled', true);
                nodes.body
                    .css('opacity', 0.5)
                    .find('input, select, button, textarea')
                    .prop('disabled', true);
                innerFocus = $(document.activeElement);
                nodes.popup.focus();
                isBusy = true;
            },

            idle = function () {
                nodes.footer
                    .find('input, select, button')
                    .prop('disabled', false);
                nodes.body
                    .css('opacity', '')
                    .find('input, select, button, textarea')
                    .prop('disabled', false);
                innerFocus.focus();
                isBusy = false;
            },

            invoke = function (e) {
                var action = e.data ? e.data.action : e,
                    async = o.async && action !== 'cancel';
                // be busy?
                if (async) {
                    busy();
                }
                // trigger action event
                self.trigger('action ' + action, data, self);
                // resolve & close?
                if (!async) {
                    deferred.resolveWith(nodes.popup, [action, data, self.getContentNode().get(0)]);
                    close();
                }

                (e.originalEvent || e).processed = true;
            },

            fnKey = function (e) {

                var items, focus, index;

                switch (e.which || e.keyCode) {
                case 27: // ESC
                    if (!isBusy) {
                        // prevent other elements to trigger close
                        e.stopPropagation();
                        if (o.easyOut) invoke('cancel');
                    }
                    break;

                case 13: // Enter
                    if (!isBusy && o.enter && $(e.target).is('input:text, input:password')) {
                        if (!_.isFunction(o.enter)) {
                            invoke(o.enter);
                        } else {
                            return o.enter.call(self);
                        }
                        return false;
                    }
                    break;

                case 9: // tab
                    if (o.tabTrap) {
                        // get items first
                        items = $(this).find('[tabindex][disabled!="disabled"]:visible');
                        if (items.length) {
                            e.preventDefault();
                            focus = $(document.activeElement);
                            index = (items.index(focus) >= 0) ? items.index(focus) : 0;
                            index += (e.shiftKey) ? -1 : 1;

                            if (index >= items.length) {
                                index = 0;
                            } else if (index < 0) {
                                index = items.length - 1;
                            }
                            items.eq(index).focus();
                        }
                    }
                    break;

                default:
                    break;
                }
            };

        // append all elements
        o.container.append(
            nodes.wrapper
                .append(nodes.underlay, nodes.popup)
        );

        _(['header', 'body', 'footer']).each(function (part) {
            nodes[part] = nodes.popup.find('.modal-' + part);
        });


        if (o.addclass) {
            nodes.popup.addClass(o.addclass);
        }
        // add event hub
        Events.extend(this);

        this.data = function (d) {
            data = d !== undefined ? d : {};
            return this;
        };

        this.header = function () {
            nodes.header.append.apply(nodes.header, arguments);
            return this;
        };

        this.getHeader = function () {
            return nodes.header;
        };

        this.getPopup = function () {
            return nodes.popup;
        };

        this.getContentNode = this.getBody = function () {
            return nodes.body;
        };

        this.getContentControls = this.getFooter = function () {
            return nodes.footer;
        };

        this.text = function (str) {
            var p = nodes.body;
            p.find('.plain-text').remove();
            p.append($('<h4 class="plain-text" id="dialog-title">').text(str || ''));
            return this;
        };

        this.build = function (fn) {
            if (_.isFunction(fn)) {
                fn.call(this);
            }
            return this;
        };

        this.append = function () {
            nodes.body.append.apply(nodes.body, arguments);
            return this;
        };

        this.prepend = function (node) {
            nodes.body.prepend(node);
            return this;
        };

        var addButton = function (action, label, dataaction, options) {

            options = options || {};

            var opt = {
                label: label,
                data: { action: action },
                click: options.click || invoke,
                dataaction: dataaction,
                purelink: options.purelink,
                inverse: options.inverse,
                tabIndex: options.tabIndex
            };

            if (options.type) {
                opt[options.type] = true;
            }
            var button = $.button(opt);
            nodes.buttons.push(button);
            return button.addClass(options.classes).attr('role', 'button');
        };

        this.addButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options));
            return this;
        };

        this.addDangerButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options).addClass('btn-danger'));
            return this;
        };

        this.addSuccessButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options).addClass('btn-success'));
            return this;
        };

        this.addWarningButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options).addClass('btn-warning'));
            return this;
        };

        this.addPrimaryButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options).addClass('btn-primary'));
            return this;
        };

        this.addAlternativeButton = function (action, label, dataaction, options) {
            nodes.footer.prepend(addButton(action, label, dataaction, options).css({ 'float': 'left', marginLeft: 0 }));
            return this;
        };

        this.addButtonMobile = function (action, label, dataaction, options) {
            return addButton(action, label, dataaction, options);
        };

        this.close = function () {
            if (!o || o.async)  {
                close();
            } else {
                invoke('cancel');
            }
        };

        this.invoke = function (action) {
            invoke(action);
            return this;
        };

        this.idle = function () {
            idle();
            return this;
        };

        this.busy = function () {
            busy();
            return this;
        };

        this.show = function (callback) {

            // enable scrollblocker - Bug 29011
            o.container.addClass('blockscroll');

            // remember focussed element
            lastFocus = $(document.activeElement);
            document.addEventListener('focus', keepFocus, true); // not via jQuery!

            // empty header?
            if (nodes.header.children().length === 0) {
                nodes.header.remove();
            }

            var fnSetDimensions = function () {
                var dim = {
                    width: parseInt(o.width || nodes.popup.width() * 1.1, 10),
                    height: parseInt(o.height || nodes.popup.height(), 10)
                };
                // limit width & height
                _(['width', 'height']).each(function (d) {
                    // apply explicit limit
                    var id = o[$.camelCase('max-' + d)];
                    if (o[id] && dim[d] > o[id]) {
                        dim[d] = o[id];
                    }
                    // apply document limits
                    var max = $(document)[d]();
                    if (dim[d] && dim[d] > max) {
                        dim[d] = max;
                    }
                });
                return dim;
            };

            var fnSetMaxDimensions = function () {
                if (nodes) {
                    var dim = fnSetDimensions();
                    nodes.popup.css({
                        width: dim.width,
                        top: o.top || 0
                    });
                    var height = $(window).height() - 170 - o.top;
                    nodes.body.css({
                        'height': height,
                        'max-height': height
                    });
                }
            };

            var dim = fnSetDimensions();

            // apply dimensions, only on desktop and pad
            if (_.device('!small')) {
                var css = { width: dim.width + 'px' };
                if (o.center) {
                    // center vertically
                    css.top = '50%';
                    var calcSize = function () {
                        if (nodes) {
                            var nodeHeight = nodes.popup.height(),
                                winHeight = $(window).height();
                            // adjust on very small windows
                            if (winHeight < nodes.popup.height()) {
                                nodeHeight = winHeight;
                                css.overflow = 'auto';
                                css.maxHeight = '100%';
                            }
                            css.marginTop = 0 - (nodeHeight / 2 >> 0) + 'px';
                            nodes.popup.css(css);
                        }
                    };

                    $(window)
                        .off('resize.checkTop')
                        .on('resize.checkTop', calcSize);
                    calcSize();

                } else {
                    // use fixed top position
                    nodes.popup.css('top', o.top || '0px');
                    if (o.maximize) {
                        fnSetMaxDimensions();
                        $(window)
                            .off('resize.maximizedpopup')
                            .on('resize.maximizedpopup', fnSetMaxDimensions);
                    }
                }
            }

            if (_.device('small')) {

                // rebuild button section for mobile devices
                nodes.popup.addClass('mobile-dialog');
                nodes.footer.rowfluid = $('<div class="row-fluid">');
                nodes.footer.append(nodes.footer.rowfluid);

                _.each(nodes.buttons, function (buttonNode) {
                    nodes.footer.rowfluid.prepend(buttonNode.addClass('btn-medium'));
                    buttonNode.wrap('<div class="span3">');
                });
            }

            this.trigger('beforeshow');

            nodes.underlay.show().addClass('in');
            nodes.popup.show();

            // focus button (if available)
            var button = nodes.popup.find('.btn-primary').first().focus();
            if (!button.length) {
                nodes.popup.find('.btn').not('.btn-danger').first().focus();
            }

            nodes.popup.on('keydown', fnKey);

            if (callback) {
                callback.call(nodes.popup, this);
            }

            this.trigger('show');

            return deferred;
        };

        nodes.underlay.click(function () {
            if (o && o.underlayAction) {
                invoke(o.underlayAction);
            }
        });

        nodes.popup.click(function () {
            if (o && o.defaultAction) {
                invoke(o.defaultAction);
            }
        });

        this.setUnderlayAction = function (action) {
            o.underlayAction = action;
            return this;
        };

        this.topmost = function () {
            nodes.underlay.addClass('topmost');
            nodes.popup.addClass('topmost');
            return this;
        };

        this.setUnderlayStyle =  function (css) {
            nodes.underlay.css(css || {});
            return this;
        };

        this.setDefaultAction = function (action) {
            o.defaultAction = action;
            return this;
        };
    };

    var CreateDialog = function (options) {

        options = $.extend(
            {top: '50px', center: false},
            options || {}
        );

        Dialog.call(this, options);
    };

    var SidePopup = function (options) {

        options = _.extend({
            modal: false,
            arrow: true,
            closely: false // closely positon to click/touch location
        }, options || {});

        var processEvent,
            isProcessed,
            open,
            close,
            closeAll,
            closeByEscapeKey,
            closeByClick,
            closeByEvent, //for example: The view within this SidePopup closes itself
            previousProp,
            timer = null,

            overlay,

            pane = $('<div class="io-ox-sidepopup-pane default-content-padding abs" tabindex="1">'),

            closer = $('<div class="io-ox-sidepopup-close">').append(
                    $('<a class="btn-sidepopup" data-action="close" tabindex="1">')
                        .text(options.saveOnClose ? gt('Save') : gt('Close'))
                ),

            popup = $('<div class="io-ox-sidepopup abs">').append(closer, pane),

            arrow = options.arrow === false ? $() :
                $('<div class="io-ox-sidepopup-arrow">').append(
                    $('<div class="border">'),
                    $('<div class="triangle">')
                ),

            target = null,

            self = this;

        pane = pane.scrollable();

        // add event hub
        Events.extend(this);

        if (options.modal) {
            overlay = $('<div class="io-ox-sidepopup-overlay abs">').append(popup, arrow);
        }

        // public nodes
        this.nodes = {};
        this.lastTrigger = null;

        processEvent = function (e) {
            if (!(e.target && $(e.target).attr('data-process-event') === 'true')) {
                (e.originalEvent || e).processed = true;
            }
        };

        isProcessed = function (e) {
            return (e.originalEvent || e).processed === true;
        };

        closeByEscapeKey = function (e) {
            if (e.which === 27) {
                close(e);
            }
        };

        closeByClick = function (e) {
            if (!(e.target && $(e.target).attr('data-process-event') === 'true') && !isProcessed(e)) {
                processEvent(e);
                close(e);
            }
        };

        closeByEvent = function (e) {
            close(e);
        };

        close = function () {
            // use this to check if it's open
            if (self.nodes.closest) {

                if (options.saveOnClose) {
                    pane.find('.settings-detail-pane').trigger('save');
                }

                // remove handlers & avoid leaks
                $(document).off('keydown', closeByEscapeKey);
                self.nodes.closest.prop('sidepopup', previousProp);
                self.nodes.click.off('click', closeByClick);
                popup.off('view:remove', closeByEvent);
                self.lastTrigger = previousProp = null;
                // use time to avoid flicker
                timer = setTimeout(function () {

                    // is inside simple-window?
                    if (self.nodes.simple.length) {
                        var popups = self.nodes.simple.find('.io-ox-sidepopup'), prev;
                        if (popups.length > 1) {
                            prev = popups.eq(-2);
                            prev.show();
                            $('body').scrollTop(prev.attr('data-scrolltop') || 0);
                        } else {
                            self.nodes.simple.find('[data-hidden-by-sidepopup]')
                                .removeAttr('data-hidden-by-sidepopup')
                                .show();
                            $('body').scrollTop(self.lastSimpleScrollPos || 0);
                        }
                        self.nodes.simple = null;
                    }

                    if (options.modal) {
                        overlay.detach();
                    } else {
                        arrow.detach();
                        popup.detach();
                    }
                    pane.empty();
                    self.trigger('close');
                }, 100);
            }
        };

        closeAll = function (e) {
            e.data.target.find('.io-ox-sidepopup').trigger('close');
        };

        popup.on('close', close);

        closer.find('.btn-sidepopup')
            .on('click', function (e) {
                pane.trigger('click'); // route click to 'pane' since closer is above pane
                close(e); // close side popup
                return false;
            })
            .on('keydown', function (e) {
                if ((e.keyCode || e.which) === 13) { // enter
                    $(this).trigger('click');
                }
            });

        popup.on('click', processEvent);

        open = function (e, handler) {
            // get proper elements
            var my = $(this), zIndex, sidepopup;
            self.nodes = {
                closest: target || my.parents('.io-ox-sidepopup-pane, .window-content, .window-container-center, .io-ox-dialog-popup, .notifications-overlay').first(),
                click: my.parents('.io-ox-sidepopup-pane, .window-body, .window-container-center, .io-ox-dialog-popup, .notifications-overlay').first(),
                target: target || my.parents('.window-body, .simple-window, .window-container-center, .notifications-overlay').first(),
                simple: my.closest('.simple-window')
            };

            // get active side popup & triggering element
            sidepopup = self.nodes.closest.prop('sidepopup') || null;
            self.lastTrigger = sidepopup ? sidepopup.lastTrigger : null;
            // get zIndex for visual stacking
            zIndex = my.parents('.io-ox-sidepopup, .window-content, .io-ox-dialog-popup, .window-container-center, .notifications-overlay').css('zIndex');
            zIndex = parseInt(zIndex, 10);
            zIndex = _.isNumber(zIndex) ? zIndex + 2 : 100;
            // second click?
            if (self.lastTrigger === this) {
                close(e);
            } else {

                // open siblings?
                if (sidepopup) {
                    sidepopup.close();
                }

                // remember as current trigger
                self.lastTrigger = this;
                previousProp = sidepopup;
                self.nodes.closest.prop('sidepopup', self);

                // prevent default to avoid close
                processEvent(e);
                // clear timer
                clearTimeout(timer);

                // add "Close all"
                if (self.nodes.closest.is('.io-ox-sidepopup-pane')) {
                    closer.find('.close-all').remove();
                    closer.prepend(
                        $('<a class="btn-sidepopup close-all" data-action="close-all">').text(gt('Close all'))
                        .on('click', { target: self.nodes.target }, closeAll)
                    );
                }

                // add handlers to close popup
                self.nodes.click.on('click', closeByClick);
                popup.on('view:remove', closeByEvent);
                $(document).on('keydown', closeByEscapeKey);


                // decide for proper side
                var docWidth = $('body').width(), mode,
                    parentPopup = my.parents('.io-ox-sidepopup').first(),
                    firstPopup = parentPopup.length === 0;

                // get side
                if (/^(left|right)$/.test(options.side)) {
                    mode = options.side;
                } else {
                    mode = (firstPopup && e.pageX > docWidth / 2) ||
                        parentPopup.hasClass('right')  ? 'left' : 'right';
                }

                popup.add(arrow).removeClass('left right').addClass(mode).css('z-index', zIndex);
                arrow.css('zIndex', zIndex + 1);

                if (options.closely && _.device('!small')) {
                    popup.add(arrow).css(mode === 'left' ? 'right' : 'left', '20%');
                }

                // is inside simple-window?
                if (self.nodes.simple.length) {
                    self.lastSimpleScrollPos = $('body').scrollTop();
                    self.nodes.simple.find('.window-content:visible')
                        .attr('data-hidden-by-sidepopup', 'true')
                        .hide();
                    self.nodes.simple.find('.io-ox-sidepopup:visible').each(function () {
                        $(this).attr('data-scrolltop', $('body').scrollTop()).hide();
                    });
                    $('body').scrollTop(0);
                }

                // add popup to proper element
                self.nodes.target.append(
                    (options.modal ? overlay : popup).css('visibility', 'hidden')
                );

                // call custom handler
                (handler || $.noop).call(self, pane.empty(), e, my);

                // set arrow top
                var halfHeight = (my.outerHeight(true) / 2 >> 0),
                    targetOffset = self.nodes.target.offset() ? self.nodes.target.offset().top : 0,
                    top = my.offset().top + halfHeight - targetOffset;
                arrow.css('top', top);

                // finally, add arrow
                (options.modal ? overlay : popup).css('visibility', '');
                if (!options.modal) {
                    self.nodes.target.append(arrow);
                }

                pane.parent().focus();
                self.trigger('show');
            }
        };

        this.delegate = function (node, selector, handler) {
            $(node).on('click', selector, function (e) {
                if ((e.originalEvent || e).processed !== true) {
                    open.call(this, e, handler);
                }
            });

            $(node).on('keypress', selector, function (e) {
                if (e.which === 13 && (e.originalEvent || e).processed !== true) {
                    open.call(this, e, handler);
                }
            });

            return this;
        };

        this.setTarget = function (t) {
            target = $(t);
            return this;
        };

        this.show = function (e, handler) {
            setTimeout(function () {
                open.call(e.target, e, handler);
            }, 0);
            return this;
        };

        this.close = function (e) {
            close(e);
        };
    };

    return {
        ModalDialog: Dialog,
        CreateDialog: CreateDialog,
        SidePopup: SidePopup,
        busy: function (node) {
            node.find('button, input').prop('disabled', true);
        },
        idle: function (node) {
            node.find('button, input').prop('disabled', false);
        }
    };
});

/* Test

require(['io.ox/core/tk/dialogs'], function (dialogs) {
    new dialogs.ModalDialog()
        .text('Are you really sure about your decision? Are you aware of all consequences you have to live with?')
        .addButton('cancel', 'No, rather not')
        .addPrimaryButton('delete', 'Shut up and delete it!')
        .show()
        .done(function (action) {
            console.debug('Action', action);
        });
});

require(['io.ox/core/tk/dialogs'], function (dialogs) {
    new dialogs.CreateDialog()
        .text(new Array(20).join('Lorem ipsum dolor sit amet, consetetur sadipscing elitr'))
        .data({ id: 1234 })
        .addButton('cancel', 'Cancel')
        .addButton('yep', 'Yep')
        .show()
        .done(function (action, data) {
            console.debug('Action', action, data);
        });
});

*/
