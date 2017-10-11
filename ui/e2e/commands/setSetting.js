module.exports = function* (module, name, value) {
    var result = yield this.executeAsyncScript(function (module, name, valueStr, done) {
        require(['settings!' + module], function (settings) {
            settings.set(name, JSON.parse(valueStr));
            done(true);
        }, function () {
            done(false);
        });
    }, module, name, JSON.stringify(value));
    console.log(result);
};
