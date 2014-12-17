
/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2014 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Mario Schroeder <mario.schroeder@open-xchange.com>
 */
define('io.ox/core/viewer/views/sidebar/fileinfoview', [
    'io.ox/core/extensions',
    'io.ox/core/viewer/eventdispatcher',
    'io.ox/core/viewer/util',
    'io.ox/core/date',
    'io.ox/core/folder/api',
    'gettext!io.ox/core/viewer'
], function (Ext, EventDispatcher, Util, OXDate, FolderAPI, gt) {

    'use strict';

    var DRIVE_ROOT_FOLDER = '9';

    Ext.point('io.ox/core/viewer/sidebar/fileinfo').extend({
        index: 100,
        id: 'fileinfo',
        draw: function (baton) {
            //console.info('FileInfoView.draw()');
            var panel, panelHeader, panelBody,
                fileName, size, modified, folderId,
                model = baton && baton.model;

            /**
             * adds a row to the panel body
             */
            function addRow(label, content) {
                var row, labelNode, contentNode;

                row = $('<div>').addClass('row');
                labelNode = $('<div>').addClass('col-xs-12 col-md-4').text(label);
                contentNode = $('<div>').addClass('col-xs-12 col-md-8').text(content);
                row.append(labelNode, contentNode);
                panelBody.append(row);
            }

            if (!model) { return; }

            fileName = model.get('filename') || '-';
            size = (_.isNumber(model.get('size'))) ? _.filesize(model.get('size')) : '-';
            modified = Util.getDateFormated(model.get('lastModified'));
            folderId = model.get('folderId');

            panel = $('<div>').addClass('panel panel-default');
            panelHeader = $('<div>').addClass('panel-heading');
            panelHeader.append($('<h3>').addClass('panel-title').text(gt('General Info')));
            panelBody = $('<div>').addClass('panel-body');

            addRow(gt('Filename'), fileName);
            addRow(gt('Size'), size);
            addRow(gt('Modified'), modified);

            FolderAPI.path(folderId)
            .done(function success(list) {
                //console.info('path: ', list);
                var folderPath = '';

                _.each(list, function (folder, index, list) {
                    var isLast = (index === list.length - 1);

                    if (folder.id !== DRIVE_ROOT_FOLDER) {
                        folderPath += gt.noI18n(FolderAPI.getFolderTitle(folder.title, 30));
                        if (!isLast) {
                            folderPath += gt.noI18n(' / ');
                        }
                    }
                });

                addRow(gt('Saved in'), folderPath);
            })
            .fail(function fail() {
                addRow(gt('Saved in'), '-');
            });

            panel.append(panelHeader, panelBody);
            baton.$el.empty().append(panel);
        }
    });

    /**
     * The FileInfoView is intended as a sub view of the SidebarView and
     * is responsible for displaying the general file details.
     */
    var FileInfoView = Backbone.View.extend({

        className: 'viewer-fileinfo',

        events: {

        },

        initialize: function () {
            //console.info('FileInfoView.initialize()');
            this.$el.on('dispose', this.dispose.bind(this));
        },

        render: function (data) {
            //console.info('FileInfoView.render() ', data);
            if (!data || !data.model) { return this; }

            var fileinfo = this.$el,
                baton = Ext.Baton({ $el: fileinfo, model: data.model, data: data.model.get('origData') });

            Ext.point('io.ox/core/viewer/sidebar/fileinfo').invoke('draw', fileinfo, baton);
            return this;
        },

        dispose: function () {
            //console.info('FileInfoView.dispose()');

            this.stopListening();
            return this;
        }
    });

    return FileInfoView;
});
