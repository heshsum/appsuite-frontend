/**
 *
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011
 * Mail: info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 *
 */

define("io.ox/contacts/main",
    ["io.ox/contacts/util",
     "io.ox/contacts/api",
     "io.ox/core/tk/vgrid",
     "io.ox/help/hints",
     "io.ox/contacts/view-detail",
     "io.ox/core/config",
     "io.ox/core/extensions",
     "io.ox/core/commons",
     "less!io.ox/contacts/style.css"
    ], function (util, api, VGrid, hints, viewDetail, config, ext, commons) {

    "use strict";

    // application object
    var app = ox.ui.createApp({ name: 'io.ox/contacts' }),
        // app window
        win,
        // grid
        grid,
        // nodes
        left,
        thumbs,
        gridContainer,
        right,
        // full thumb index
        fullIndex = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // launcher
    app.setLauncher(function () {

        // get window
        win = ox.ui.createWindow({
            name: 'io.ox/contacts',
            title: "Global Address Book",
            toolbar: true,
            search: true
        });

        app.setWindow(win);

        // left panel
        win.nodes.main.append(
            left = $('<div class="leftside">').append(
                // grid container
                gridContainer = $('<div class="abs border-left border-right contact-grid-container">'),
                // thumb index
                thumbs = $('<div class="atb contact-grid-index border-right">')
            )
        );

        // folder tree
        commons.addFolderView(app, { type: 'contacts', view: 'FolderList' });

        // right panel
        right = $("<div>")
            .addClass("rightside default-content-padding")
            .appendTo(win.nodes.main)
            .scrollable();

        // grid
        grid = new VGrid(gridContainer);

        // add template
        grid.addTemplate({
            build: function () {
                var name, email, job;
                this
                    .addClass("contact")
                    .append(name = $("<div>").addClass("fullname"))
                    .append(email = $("<div>"))
                    .append(job = $("<div>").addClass("bright-text"));
                return { name: name, job: job, email: email };
            },
            set: function (data, fields, index) {
                if (data.mark_as_distributionlist === true) {
                    fields.name.text(data.display_name || "");
                    fields.email.text("");
                    fields.job.text("Distribution list");
                } else {
                    fields.name.text(util.getFullName(data));
                    fields.email.text(util.getMail(data));
                    fields.job.text(util.getJob(data));
                }
            }
        });

        // add label template
        grid.addLabelTemplate({
            build: function () {
            },
            set: function (data, fields, index) {
                var name = data.last_name || data.display_name || "#";
                this.text(name.substr(0, 1).toUpperCase());
            }
        });

        // requires new label?
        grid.requiresLabel = function (i, data, current) {
            var name = data.last_name || data.display_name || "#",
                prefix = name.substr(0, 1).toUpperCase();
            return (i === 0 || prefix !== current) ? prefix : false;
        };

        commons.wireGridAndAPI(grid, api);
        commons.wireGridAndSearch(grid, win, api);

        // LFO callback
        var showContact, drawContact, drawFail;

        showContact = function (obj) {
            // get contact
            right.busy(true);
            app.currentContact = obj;
            api.get(api.reduce(obj))
                .done(_.lfo(drawContact))
                .fail(_.lfo(drawFail, obj));
        };

        drawContact = function (data) {
            //right.idle().empty().append(base.draw(data));
            right.idle().empty().append(viewDetail.draw(data));
        };

        drawFail = function (obj) {
            right.idle().empty().append(
                $.fail("Oops, couldn't load contact data.", function () {
                    showContact(obj);
                })
            );
        };

        /**
         * Thumb index
         */
        function drawThumb(char, enabled) {
            var node = $('<div>')
                .addClass('thumb-index border-bottom' + (enabled ? '' : ' thumb-index-disabled'))
                .text(char);
            if (enabled) {
                node.on('click', { text: char }, grid.scrollToLabelText);
            }
            return node;
        }

        // draw thumb index
        grid.on('change:ids', function () {
            // get labels
            thumbs.empty();
            var textIndex = grid.getLabels().textIndex || {};
            _(fullIndex).each(function (char) {
                // add thumb
                thumbs.append(drawThumb(char, char in textIndex));
            });
        });

        commons.wireGridAndSelectionChange(grid, 'io.ox/contacts', showContact, right);
        commons.wireGridAndWindow(grid, win);
        commons.wireFirstRefresh(app, api);
        commons.wireGridAndRefresh(grid, api, win);

        api.on("edit", function (evt, updated) {
            if (updated.folder === app.currentContact.folder_id && updated.id === app.currentContact.id) {
                // Reload
                showContact(app.currentContact);
            }
        });

        app.getGrid = function () {
            return grid;
        };

        // go!
        commons.addFolderSupport(app, grid, 'contacts')
            .done(commons.showWindow(win, grid));
    });


    return {
        getApp: app.getInstance
    };
});

