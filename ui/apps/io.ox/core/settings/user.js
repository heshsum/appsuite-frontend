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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define('io.ox/core/settings/user', ['io.ox/core/extensions', 'io.ox/core/api/user', 'io.ox/contacts/model', 'io.ox/contacts/edit/view-form', 'io.ox/core/tk/dialogs'], function (ext, api, contactModel, ViewForm, dialogs) {
	'use strict';


	// Model Factory for use with the edit dialog
	var factory = contactModel.protectedMethods.buildFactory('io.ox/core/user/model', api);

	// The edit dialog
	var UserEdit = ViewForm.protectedMethods.createContactEdit('io.ox/core/user');

	return {
		editCurrentUser: function ($node) {
			// Load the user
			return factory.realm('edit').get({}).done(function (user) {
				$node.append(new UserEdit({model: user}).render().$el);
				user.on('sync:start', function () {
					dialogs.busy($node);
				});

				user.on('sync:always', function () {
					dialogs.idle($node);
				});
			});
		}
	};
	
});