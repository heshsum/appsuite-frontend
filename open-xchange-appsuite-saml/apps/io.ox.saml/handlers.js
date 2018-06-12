define('io.ox.saml/handlers', ['io.ox/core/extensions'], function (ext) {
    function RedirectHandler(options) {
        options = options || {};

        _.extend(this, options, {
            id: 'saml_redirect',
            handle: function (baton) {
                var uri = baton.data.redirect_uri;
                if (uri) {
                    baton.handled = $.Deferred();
                    if ((/^http/i).test(uri)) {
                        window.location = uri;
                        _.defer(function () {
                            if (window.location.href !== uri) return;
                            window.location.reload();
                        });
                    } else {
                        var path = '';
                        if (uri.indexOf('/') === 0) {
                            path = uri;
                        } else {
                            path = '/' + uri;
                        }

                        var proto = window.location.protocol,
                            host = window.location.host;
                        uri = proto + '//' + host + path;
                        window.location = uri;
                        _.defer(function () {
                            if (window.location.href !== uri) return;
                            window.location.reload();
                        });
                    }
                }
            }
        });
    }

    ext.point('io.ox.saml/relogin').extend(new RedirectHandler());
    ext.point('io.ox.saml/logout').extend(new RedirectHandler());
    ext.point('io.ox.saml/login').extend(new RedirectHandler());
});
