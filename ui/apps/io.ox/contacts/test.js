/**
 * All content on this website (including text, images, source code and any
 * other original works), unless otherwise noted, is licensed under a Creative
 * Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011 Mail: info@open-xchange.com
 *
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define("io.ox/contacts/test",
    ["io.ox/core/extensions", "io.ox/contacts/main",
     "io.ox/contacts/api"], function (ext, contacts, api) {

    "use strict";


    // test objects
    var testObject = {
            first_name: 'Georg',
            last_name: 'Tester',
            email1: 'tester@test.de',
            cellular_telephone1: '0815123456789'
        },

        TIMEOUT = ox.testTimeout;

    // helpers
    function Done() {
        var f = function () {
            return f.value;
        };
        f.value = false;
        f.yep = function () {
            f.value = true;
        };
        return f;
    }

    /*
     * Suite: Contacts Test
     */
    ext.point('test/suite').extend({
        id: 'contacts-create',
        index: 100,
        test: function (j) {
            j.describe("Contact create", function () {

                var app = null,
                    id, dataId, dataFolder, dataObj, createButton, saveButton, formFrame, testfield, alert, closeButton;

                j.it('opens contact app ', function () {

                    var loaded = new Done();

                    j.waitsFor(loaded, 'Could not load app', TIMEOUT);

                    contacts.getApp().launch().done(function () {
                        app = this;
                        app.folder.setDefault().done(function () {
                            loaded.yep();
                            j.expect(app).toBeTruthy();
                        });
                    });
                });

                j.waitsFor(function () {
                    createButton = $("a[data-action='io.ox/contacts/actions/create']");
                    if (createButton[0]) {
                        return true;
                    }
                }, 'waits', TIMEOUT);

                j.it('looks for create button and hits ', function () {
                    j.expect(createButton[0]).toBeTruthy();
                    $(createButton[0]).trigger('click');

                });

                j.waitsFor(function () {
                    formFrame = $('.edit-contact');
                    if (formFrame[0]) {
                        return true;
                    }
                }, 'no form there', TIMEOUT);

                j.it('looks for the form and autofills ', function () {
                    for (var i in testObject) {
                        formFrame.find("input[name='" + i + "']").val(testObject[i]).trigger('change');
                    }
                    j.expect(formFrame[0]).toBeTruthy();
                });

                j.it('checks for alert div ', function () {
                    testfield = $('[name="email1"]');

                    j.waitsFor(function () {
                        if (testfield[0]) {
                            return true;
                        }
                    });

                    j.runs(function () {
                        testfield.val('wrong_mail').trigger('change');
                    });

                    j.waitsFor(function () {
                        alert = formFrame.find('.help-block.error');
                        if (alert[0]) {
                            return true;
                        }
                    });

                    j.runs(function () {
                        j.expect(alert).toBeTruthy();
                    });

                });

                j.it('corrects the value and skips the alert', function () {

                    j.runs(function () {
                        testfield.val('tester@test.de').trigger('change');
                    });

                });

                j.it('looks for the save button and hits', function () {
                    saveButton = formFrame.find('[data-action="save"]');
                    saveButton.trigger('click');
                    j.expect(saveButton[0]).toBeTruthy();
                });

                j.it('looks for the saved item and compares incl. autogenerated displayname', function () {

                    j.runs(function () {
                        var me = this;
                        me.ready = false;
                        api.on('created', function (e, data) {
                            if (data) {
                                dataId = data.id;
                                dataFolder = data.folder;
                                me.ready = true;
                            }
                        });

                        j.waitsFor(function () {
                            return this.ready;
                        }, 'catches the id', TIMEOUT);

                    });

                    j.runs(function () {
                        api.get({
                            id: dataId,
                            folder_id: dataFolder
                        }).done(function (obj) {
                            dataObj = obj;
                        });

                        j.waitsFor(function () {
                            if (dataObj) {
                                return true;
                            }
                        }, 'looks for the object', TIMEOUT);

                        j.runs(function () {
                            j.expect(dataObj.first_name).toEqual(testObject.first_name);
                            j.expect(dataObj.last_name).toEqual(testObject.last_name);
                            j.expect(dataObj.display_name).toEqual('Tester, Georg');
                            j.expect(dataObj.email1).toEqual(testObject.email1);
                            j.expect(dataObj.cellular_telephone1).toEqual(testObject.cellular_telephone1);
                        });

                    });
                });

                j.it('looks for the created item / selects and deletes', function () {

                    var button, dialog,
                        cid = dataFolder + '.' + dataId,
                        grid = app.getGrid();

                    j.waitsFor(function () {
                        // grid contains item?
                        if (grid.contains(cid)) {
                            grid.selection.set({ folder_id: dataFolder, id: dataId });
                            return true;
                        } else {
                            return false;
                        }
                    }, 'looks for the list', TIMEOUT);

                    j.waitsFor(function () {
                        button = $('.io-ox-inline-links a[data-action="delete"]');
                        if (button[0]) {
                            console.log(button);
                            return true;
                        }
                    }, 'looks for delete button', TIMEOUT);

                    j.runs(function () {
                        button.trigger('click');
                    });

                    j.waitsFor(function () {
                        dialog = $('.io-ox-dialog-popup .btn[data-action="delete"]');
                        if (dialog[0]) {
                            return true;
                        }
                    }, 'delete dialog to be there', TIMEOUT);

                    j.runs(function () {
                        j.expect(dialog).toBeTruthy();
                    });

                    j.runs(function () {
                        dialog.trigger('click');

                        app = id = dataId = dataFolder = dataObj = createButton = saveButton = formFrame = testfield = alert = closeButton = null;
                    });

                });
            });
        }
    });
});
