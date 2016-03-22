/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */
define(['io.ox/tasks/util', 'gettext!io.ox/tasks', 'io.ox/core/date'
], function (util, gt, date) {
    describe('Tasks Utilities', function () {
        var options = {
            testData: {
                'status': 2,
                'title': undefined
            },
            testDataArray: [
                {
                    'status': 3,
                    'title': 'Top Test'
                }, {
                    'end_date': 1895104800000,
                    'status': 1,
                    'title': 'Blabla'
                },
                {
                    'end_date': 1895104800000,
                    'status': 1,
                    'title': 'Abc'
                }, {
                    'status': 1,
                    'title': 'Test Title',
                    'end_date': 1384999200000
                }
            ]
        };
        describe('interpreting a task', function () {

            it('should work on a copy', function () {
                util.interpretTask(options.testData);
                expect(options.testData).not.to.contain.key('badge');
            });

            it('should add badge', function () {
                var result = util.interpretTask(options.testData);
                expect(result).to.contain.key('badge');
            });

            it('should change status to a string', function () {
                var result = util.interpretTask(options.testData);
                expect(result.status).to.be.a('String');
            });

            it('should add \u2014 if title is empty', function () {
                var result = util.interpretTask(options.testData);
                expect(result.title).to.equal('\u2014');
            });

            it('should add badges if detail parameter is set', function () {
                var result = util.interpretTask(options.testData, {detail: true});
                expect(result.badge).to.equal('badge');
            });
        });

        describe('buildOptionArray', function () {
            var stub;
            it('should return an array', function () {
                var result = util.buildOptionArray();
                expect(result).to.be.an('Array');
            });

            it('should only contain full days if parameter is set', function () {
                var result = _.object(util.buildOptionArray({daysOnly: true}));
                expect(result[5]).not.to.exist;
                result = _.object(util.buildOptionArray());
                expect(result[5]).to.equal(gt('in 5 minutes'));
            });

            it('should not contain past daytimes', function () {
                var myDate = new date.Local(),
                    result, stub;

                myDate.setHours(7);
                //super special UI time hack
                stub = sinon.stub(date, 'Local');
                stub.returns(myDate);

                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.key('d0');
                expect(result).to.include.key('5');

                myDate.setHours(13);
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.key('d1');
                expect(result).to.include.key('5');

                myDate.setHours(16);
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.key('d2');
                expect(result).to.include.key('5');


                myDate.setHours(19);
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.key('d3');
                expect(result).to.include.key('5');

                myDate.setHours(23);
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.key('d4');
                expect(result).to.include.key('5');

                stub.restore();
            });

            it('should set weekdays correctly', function () {
                var myDate = new date.Local(),
                    result, stub;

                //super special UI time hack
                stub = sinon.stub(date, 'Local');
                stub.returns(myDate);

                //today and tomorrow are special and should not be included in standard next ...day
                myDate.setDate(myDate.getDate() - myDate.getDay());//sunday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w0', 'w1']);
                expect(result).to.include.keys(['w2', 'w3', 'w4', 'w5', 'w6']);

                myDate.setDate(myDate.getDate() + 1);//monday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w1', 'w2']);
                expect(result).to.include.keys(['w0', 'w3', 'w4', 'w5', 'w6']);

                myDate.setDate(myDate.getDate() + 1);//tuesday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w2', 'w3']);
                expect(result).to.include.keys(['w0', 'w1', 'w4', 'w5', 'w6']);

                myDate.setDate(myDate.getDate() + 1);//wednesday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w3', 'w4']);
                expect(result).to.include.keys(['w0', 'w1', 'w2', 'w5', 'w6']);

                myDate.setDate(myDate.getDate() + 1);//thursday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w4', 'w5']);
                expect(result).to.include.keys(['w0', 'w1', 'w2', 'w3', 'w6']);

                myDate.setDate(myDate.getDate() + 1);//friday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w5', 'w6']);
                expect(result).to.include.keys(['w0', 'w1', 'w2', 'w3', 'w4']);

                myDate.setDate(myDate.getDate() + 1);//saturday
                result = _.object(util.buildOptionArray());
                expect(result).not.to.include.keys(['w6', 'w0']);
                expect(result).to.include.keys(['w1', 'w2', 'w3', 'w4', 'w5']);

                stub.restore();
            });
        });

        describe('buildDropdownMenu', function () {

            it('should return an array', function () {
                var result = util.buildDropdownMenu();
                expect(result).to.be.an('Array');
            });

            it('should return correct nodeTypes', function () {
                var result = util.buildDropdownMenu();
                expect(result[0].is('option')).be.true;
                result = util.buildDropdownMenu({bootstrapDropdown: true});
                expect(result[0].is('li')).to.be.true;
            });
        });
        describe('computePopupTime', function () {

            it('should only return full days', function () {
                var result = new date.Local(util.computePopupTime('t').endDate);

                expect(result.getHours()).to.equal(0);
                expect(result.getMinutes()).to.equal(0);
                expect(result.getSeconds()).to.equal(0);
                expect(result.getMilliseconds()).to.equal(0);
            });
        });
        describe('sortTasks', function () {

            it('should work on a copy', function () {
                util.sortTasks(options.testDataArray);
                expect(options.testDataArray[0]).to.deep.equal({'status': 3, 'title': 'Top Test'});
            });

            it('should sort overdue tasks to first position', function () {
                var result = util.sortTasks(options.testDataArray);
                expect(result[0]).to.deep.equal({'status': 1, 'title': 'Test Title', 'end_date': 1384999200000 });
            });

            it('should sort done tasks to last position', function () {
                var result = util.sortTasks(options.testDataArray);
                expect(result[3]).to.deep.equal({'status': 3, 'title': 'Top Test'});
            });

            it('should sort same dates alphabetically', function () {
                var result = util.sortTasks(options.testDataArray);
                expect(result[1]).to.deep.equal({'end_date': 1895104800000, 'status': 1, 'title': 'Abc'});
                expect(result[2]).to.deep.equal({'end_date': 1895104800000, 'status': 1, 'title': 'Blabla'});
            });
        });
    });
});
