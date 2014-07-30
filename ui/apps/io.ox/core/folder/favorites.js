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

define('io.ox/core/folder/favorites',
    ['io.ox/core/folder/node',
     'io.ox/core/folder/api',
     'io.ox/core/extensions',
     'settings!io.ox/core'
     ], function (TreeNodeView, api, ext, settings) {

    'use strict';

    _('mail contacts infostore'.split(' ')).each(function (module) {

        // register collection
        var id = 'virtual/favorites/' + module,
            model = api.pool.getModel(id),
            collection = api.pool.getCollection(id),
            favorites = settings.get('favorites/' + module, []);

        function store() {
            var ids = collection.pluck('id').sort();
            settings.set('favorites/' + module, ids).save();
        }

        collection.on('add remove', store);

        function initialize(id) {
            api.multiple(favorites).done(function (response) {
                // compact() removes non-existent entries
                var list = _(response).compact();
                // update collection
                list = api.processListResponse(id, list);
                collection.reset(list);
                model.set('subfolders', true);
                // // if there was an error we update settings
                if (list.length !== response.length) store();
            });
        }

        var extension = {
            id: 'favorites',
            before: 'standard-folders',
            draw: function (tree) {

                this.append(
                    new TreeNodeView({
                        empty: false,
                        folder: id,
                        open: false,
                        parent: tree,
                        title: 'Favorites',
                        tree: tree
                    })
                    .render().$el.addClass('favorites')
                );

                if (favorites.length > 0) initialize(id);
            }
        };

        ext.point('io.ox/core/foldertree/' + module + '/app').extend(_.extend({}, extension));
        ext.point('io.ox/core/foldertree/' + module + '/popup').extend(_.extend({}, extension));
    });

    //
    // Add to contextmenu
    //

    function add(e) {
        var id = e.data.id,
            module = e.data.module,
            model = api.pool.getModel(id),
            collection = api.pool.getCollection('virtual/favorites/' + module);
        collection.add(model);
        collection.sort();
    }

    function remove(e) {
        var id = e.data.id,
            module = e.data.module,
            model = api.pool.getModel(id),
            collection = api.pool.getCollection('virtual/favorites/' + module);
        collection.remove(model);
    }

    function a(action, text) {
        return $('<a href="#" tabindex="1" role="menuitem">')
            .attr('data-action', action).text(text)
            .on('click', $.preventDefault); // always prevent default
    }

    function disable(node) {
        return node.attr('aria-disabled', true).removeAttr('tabindex').addClass('disabled');
    }

    function addLink(node, options) {
        var link = a(options.action, options.text);
        if (options.enabled) link.on('click', options.data, options.handler); else disable(link);
        node.append($('<li>').append(link));
        return link;
    }

    ext.point('io.ox/core/foldertree/contextmenu').extend({
        id: 'toggle-favorite',
        index: 1000,
        draw: function (baton) {

            var id = baton.data.id,
                module = baton.module,
                favorites = settings.get('favorites/' + module, []),
                isFavorite = _(favorites).indexOf(id) > -1;

            addLink(this, {
                action: 'toggle-favorite',
                data: { id: id, module: module },
                enabled: true,
                handler: isFavorite ? remove : add,
                text: isFavorite ? 'Remove from favorites' : 'Add to favorites'
            });
        }
    });
});
