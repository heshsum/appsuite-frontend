/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2014 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/backbone/mini-views/dropdown', ['io.ox/backbone/mini-views/abstract'], function (AbstractView) {

    'use strict';

    // Bootstrap dropdown

    var Dropdown = AbstractView.extend({

        tagName: 'div',
        className: 'dropdown',

        onClick: function (e) {
            e.preventDefault();
            var node = $(e.currentTarget),
                name = node.attr('data-name'),
                value = node.data('value'),
                toggle = node.data('toggle');
            if (value === undefined) return; // ignore plain links
            this.model.set(name, toggle === true ? !this.model.get(name) : value);
        },

        setup: function () {
            this.$ul = $('<ul class="dropdown-menu" role="menu">');
            this.$ul.on('click', 'a', $.proxy(this.onClick, this)); // not so nice but we need this for mobile support
            if (this.model) this.listenTo(this.model, 'change', this.update);
        },

        update: function () {
            var $ul = this.$ul;
            if (!this.model) return;
            _(this.model.changed).each(function (value, name) {
                var li = $ul.find('[data-name="' + name + '"]');
                // clear check marks
                li.children('i').attr('class', 'fa fa-fw fa-none');
                // loop over list items also allow compare non-primitive values
                li.each(function () {
                    var node = $(this);
                    if (_.isEqual(node.data('value'), value)) node.children('i').attr('class', 'fa fa-fw fa-check');
                });
            }, this);
            // update drop-down toggle
            this.label();
        },

        label: function () {
            // extend this class for a custom implementation
        },

        stringify: function (value) {
            return _.isObject(value) ? JSON.stringify(value) : value;
        },

        append: function (fn) {
            this.$ul.append($('<li>').attr({ role: 'presentation' }).append(fn));
            return this;
        },

        option: function (name, value, text) {
            return this.append(
                $('<a href="#">')
                .attr({
                    role: 'menuitem',
                    'data-name': name,
                    'data-value': this.stringify(value),
                    'data-toggle': _.isBoolean(value)
                })
                .data('value', value) // store original value
                .append(
                    $('<i class="fa fa-fw">').attr('aria-hidden', true).addClass(_.isEqual(this.model.get(name), value) ? 'fa-check' : 'fa-none'),
                    _.isFunction(text) ? text() : $('<span>').text(text)
                )
            );
        },

        link: function (name, text, callback) {
            return this.append(
                $('<a href="#">', { href: '#', 'data-name': name })
                .text(text).on('click', callback)
            );
        },

        header: function (text) {
            this.$ul.append($('<li class="dropdown-header" role="sectionhead">').text(text).attr('aria-hidden', true));
            return this;
        },

        divider: function () {
            this.$ul.append('<li class="divider" role="separator">');
            return this;
        },

        render: function () {
            var label = _.isFunction(this.options.label) ? this.options.label() : $.txt(this.options.label),
                ariaLabel = this.options.aria ? this.options.aria : '';
            if (_.isString(label)) {
                ariaLabel += (' ' + label);
            }
            this.$el.append(
                $('<a>').attr({
                    href: '#',
                    tabindex: 1,
                    role: 'menuitem',
                    'aria-haspopup': true,
                    'aria-label': ariaLabel,
                    'data-toggle': 'dropdown'
                }).append(
                    // label
                    $('<span class="dropdown-label">').append(
                        label
                    ),
                    // caret
                    this.options.caret ? $('<i class="fa fa-caret-down">') : []
                ),
                this.$ul
            );
            // update custom label
            this.label();
            return this;
        }
    });

    return Dropdown;
});
