/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011
 * Mail: info@open-xchange.com
 *
 * @author Tobias Prinz <tobias.prinz@open-xchange.com>
 */

define("plugins/halo/mail/register",
    ["io.ox/core/extensions"], function (ext) {

    "use strict";

    ext.point("io.ox/halo/contact:renderer").extend({
        id: "mail",
        handles: function (type) {
            return type === "com.openexchange.halo.mail";
        },
        draw: function  ($node, providerName, mail) {
            var deferred = new $.Deferred();

            $node.append(
                $("<div/>").addClass("widget-title clear-title").text("Recent conversations")
            );

            if (mail.length === 0) {
                $node.append("<div/>").text("No messages seem to have been exchanged previously.");
                deferred.resolve();
            } else {
                var sent = [];
                var received = [];
                _.each(mail, function (elem) {
                    if (elem.folder_id.match(/INBOX$/i)) {
                        received.push(elem);
                    } else {
                        sent.push(elem);
                    }
                });                

                require(
                    ["io.ox/core/tk/dialogs", "io.ox/mail/view-grid-template", "io.ox/mail/api"],
                    function (dialogs, viewGrid, api) {
                        
                        var left = $("<div/>").addClass("io-ox-left-column");
                        if (received.length === 0) {
                            left.append("<div/>").text("Cannot find any messages this contact sent to you.");
                        } else {
                            left.append($("<h2/>").text("Messages you received:"));
                            left.append(viewGrid.drawSimpleGrid(received));
                        }
                        $node.append(left);
                        
                        var right = $("<div/>").addClass("io-ox-right-column");
                        if (sent.length === 0) {
                            right.append("<div/>").text("Cannot find any messages you sent to this contact.");
                        } else {
                            right.append($("<h2/>").text("Messages you sent:"));
                            right.append(viewGrid.drawSimpleGrid(sent));
                        }
                        $node.append(right);
                        
                        new dialogs.SidePopup()
                            .delegate($node, ".vgrid-cell", function (popup) {
                                var msgData = $(this).data("objectData");
                                api.get(msgData).done(function (data) {
                                    require(["io.ox/mail/view-detail"], function (view) {
                                        popup.append(view.draw(data).removeClass("page"));
                                        data = null;
                                    });
                                });
                            });

                        deferred.resolve();
                    }
                );
            }

            return deferred;
        }
    });

    ext.point("io.ox/halo/contact:requestEnhancement").extend({
        id: "request-mail",
        enhances: function (type) {
            return type === "com.openexchange.halo.mail";
        },
        enhance: function (request) {
            request.appendColumns = true;
            request.columnModule = "mail";
            request.params.limit = 10;
            request.params.columns = "102,600,601,602,603,604,605,606,607,608,609,610,611,612,614,652";
        }
    });
});