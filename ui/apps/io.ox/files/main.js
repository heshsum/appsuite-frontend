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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 *
 */

 define("io.ox/files/main",
     ["io.ox/files/base", "io.ox/files/api", "css!io.ox/files/style.css"], function (base, api) {

    // application object
    var app = ox.ui.createApp(),
        // app window
        win;
    
    // launcher
    app.setLauncher(function () {

        // get window
        win = ox.ui.createWindow({
            title: "Files",
            search: true
        });
        
        app.setWindow(win);
        
        
        var currentFolder = null;

        // left side
        var left = $("<div/>").addClass("leftside border-right")
            .css({
                width: "309px",
                overflow: "auto"
            })
            .appendTo(win);

        var right = $("<div/>")
            .css({ left: "347px", overflow: "auto" })
            .addClass("rightside")
            .appendTo(win);

        // Grid
        var vg = window.vg = new ox.ui.tk.VGrid(left);
        // add template
        vg.addTemplate({
            build: function () {
                var name;
                this
                    .addClass("file")
                    .append(name = $("<div/>").addClass("name"));
                return { name: name };
            },
            set: function (data, fields, index) {
                fields.name.text(data.title);
            }
        });
       
        // get all IDs
        vg.loadIds = function (cont) {
            currentFolder.getAll()
                .done(cont);
        };
        // get header data
        vg.loadData = function (ids, cont) {
            currentFolder.getList(ids)
                .done(cont);
        };
        // go!
        api.defaultFolder().done(function (folder) {
            currentFolder = folder;
            vg.paint(function () {
                // select first item
                vg.selection.selectFirst();
            });
        });

        vg.selection.bind("change", function (selection) {
            if (selection.length === 1) {
                // get file
                currentFolder.get(selection[0].id)
                .done(function (data) {
                    // draw file
                    right.empty().append(base.draw(data));
                });
            } else {
                right.empty();
            }
        });
        vg.loadIds = function (cont) {
            currentFolder.getAll()
                .done(cont);
        };

        // get header data
        vg.loadData = function (ids, cont) {
            currentFolder.getList(ids)
                .done(cont);
        };
        // go!
        api.defaultFolder().done(function (folder) {
            currentFolder = folder;
            vg.paint(function () {
                // select first item
                vg.selection.selectFirst();
            });
            win.show();
        });

        vg.selection.bind("change", function (selection) {
            if (selection.length === 1) {
                // get file
                currentFolder.get(selection[0].id)
                .done(function (data) {
                    // draw file
                    right.empty().append(base.draw(data));
                });
            } else {
                right.empty();
            }
        });
        
    });
    
    return {
        getApp: app.getInstance
    };
});
