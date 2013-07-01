/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/mail/statistics',
    ['io.ox/mail/api',
     'io.ox/core/api/account',
     'gettext!io.ox/mail',
     'apps/io.ox/core/tk/charts.js'], function (api, accountAPI, gt) {

    'use strict';

    var COLUMNS = '603,604,610',
        WIDTH = _.device('small') ? 280 : 500,
        HEIGHT = _.device('small') ? 150 : 200;

    function createCanvas() {
        // attribute notation does not work! don't know why. maybe retina whatever.
        return $('<canvas width="' + WIDTH + '" height="' + HEIGHT + '">');
    }

    var fetch = (function () {

        // hash of deferred objects
        var hash = {};

        return function (options) {

            var cid = JSON.stringify(options);

            if (!hash[cid]) {
                hash[cid] = api.getAll({ folder: options.folder, columns: COLUMNS });
            }

            return hash[cid];
        };

    }());

    return {

        sender: function (node, options) {

            var canvas = createCanvas(),
                isSent = accountAPI.is('sent', options.folder);

            node.append(
                $('<h2>').text(
                    isSent ? gt('Top 10 you sent mail to') : gt('Top 10 you got mail from')
                ),
                canvas
            );

            fetch({ folder: options.folder, columns: COLUMNS }).done(function (data) {

                var who = {}, attr = isSent ? 'to' : 'from';

                _(data).each(function (obj) {
                    var mail = String((obj[attr] && obj[attr][0] && obj[attr][0][1]) || '').toLowerCase();
                    who[mail] = (who[mail] || 0) + 1;
                });

                data = _(who).chain()
                    .pairs()
                    .sortBy(function (obj) { return -obj[1]; })
                    .first(10) // as we want the highest numbers
                    .value();

                var chart = {
                    labels: '1 2 3 4 5 6 7 8 9 10'.split(' '),
                    datasets: [{
                        fillColor: 'rgba(0, 136, 204, 0.15)',
                        strokeColor: 'rgba(0, 136, 204, 0.80)',
                        pointColor: 'rgba(0, 136, 204, 1)',
                        pointStrokeColor: '#fff',
                        data: _(data).pluck(1)
                    }]
                };

                node.idle();

                var ctx = canvas.get(0).getContext('2d');
                new window.Chart(ctx).Line(chart, {});

                node.append(
                    $('<ol>').append(
                        _(data).map(function (obj) {
                            return $('<li>').append(
                                $('<a href="#" class="halo-link">')
                                .data({ email1: obj[0] }).text(obj[0] + ' (' + obj[1] + ')')
                            );
                        })
                    )
                );
            });

            return canvas;
        },

        weekday: function (node, options) {

            var canvas = createCanvas();

            node.append(
                $('<h2>').text(gt('Mails per week-day (%)')),
                canvas
            );

            fetch({ folder: options.folder, columns: COLUMNS }).done(function (data) {

                var days = [0, 0, 0, 0, 0, 0, 0];

                _(data).each(function (obj) {
                    var day = (new Date(obj.received_date).getUTCDay() + 6) % 7;
                    days[day]++;
                });

                days = _(days).map(function (sum) {
                    return Math.round(sum / data.length * 100);
                });

                var chart = {
                    labels: 'Mo Di Mi Do Fr Sa So'.split(' '),
                    datasets: [{
                        fillColor: 'rgba(0, 136, 204, 0.15)',
                        strokeColor: 'rgba(0, 136, 204, 0.80)',
                        pointColor: 'rgba(0, 136, 204, 1)',
                        pointStrokeColor: '#fff',
                        data: days
                    }]
                };

                node.idle();

                var ctx = canvas.get(0).getContext('2d');
                new window.Chart(ctx).Line(chart, {});
            });

            return canvas;
        },

        hour: function (node, options) {

            var canvas = $('<canvas width="500" height="200">');

            node.append(
                $('<h2>').text(gt('Mails per hour (%)')),
                canvas
            );

            fetch({ folder: options.folder, columns: COLUMNS }).done(function (data) {

                var hours = _.times(24, function () { return 0; });

                _(data).each(function (obj) {
                    var h = new Date(obj.received_date).getUTCHours();
                    hours[h]++;
                });

                hours = _(hours).map(function (sum) {
                    return Math.round(sum / data.length * 100);
                });

                var chart = {
                    labels: '0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23'.split(' '),
                    datasets: [{
                        fillColor: 'rgba(0, 136, 204, 0.15)',
                        strokeColor: 'rgba(0, 136, 204, 0.80)',
                        pointColor: 'rgba(0, 136, 204, 1)',
                        pointStrokeColor: '#fff',
                        data: hours
                    }]
                };

                node.idle();

                var ctx = canvas.get(0).getContext('2d');
                new window.Chart(ctx).Line(chart, {});
            });

            return canvas;
        }
    };
});
