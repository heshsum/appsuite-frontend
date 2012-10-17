/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 * 
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * 
 * Copyright (C) Open-Xchange Inc., 2011
 * Mail: info@open-xchange.com 
 * 
 * @author Viktor Pracht <viktor.pracht@open-xchange.com>
 */

var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var globSync = require("./glob").globSync;
var _ = require("../underscore");

/**
 * Default destination directory.
 * @type String
 * @name exports.builddir
 */

/**
 * Resolves a filename relative to the build directory.
 * @param {String} name The filename to resolve
 * @type String
 * @return The filename in the build directory.
 */
exports.dest = function(name) { return path.join(exports.builddir, name); };

/**
 * Number of generated files.
 * @type Number
 */
var counter = 0;

exports.startTime = new Date;

function FileType() {}

/**
 * Returns all applicable hooks of a specific hook type. 
 * @param {String} type The hook type to return.
 * @param {Function or Array} prepend An optional hook or array of hooks to
 * prepend before all other hooks.
 * @type Array
 * @returns An array of hooks.
 */
FileType.prototype.getHooks = function(type, prepend) {
    return [].concat(prepend || [], this[type] || [], types["*"][type] || []);
};

/**
 * Adds a hook to this file type.
 * @param {String} type The type of the added hook.
 * @param {Function} hook The hook function to add.
 * @type FileType
 * @return Itself, for chaining.
 */
FileType.prototype.addHook = function(type, hook) {
    var hooks = this[type] || (this[type] = []);
    hooks.push(hook);
    return this;
};

/**
 * Types of files which are processed with the same settings.
 * Each type consists of an array of handlers for dependency-building and
 * an array of filters to process the file contents. Optionally, other types
 * of hooks can be used by individual handlers and filters.
 * The special type "*" applies to all files and is applied after
 * the type-specific handlers and filters.
 */
var types = { "*": new FileType() };

exports.fileType = function(type) {
    return types[type] || (types[type] = new FileType());
};

/**
 * The name of the current top level task, if any.
 */
var topLevelTaskName = null;

/**
 * Defines a new top-level task.
 * Any subsequent file utility functions will add their target files to this
 * task as dependencies.
 * @param {String} name An optional name of the new task. If not specified,
 * no new task is created and automatic dependencies won't be created anymore.
 */
exports.topLevelTask = function(name) {
    topLevelTaskName = name;
    if (name) return task.apply(this, arguments);
};

exports.fileType("*").addHook("handler", function(filename) {
    if (topLevelTaskName) task(topLevelTaskName, [filename]);
});

/**
 * Callback for top-level tasks to report the number of generated files and the
 * build time.
 */
exports.summary = function(name) {
    return function() {
        var ms = (new Date).getTime() - exports.startTime.getTime();
        console.log("Generated " + counter + (counter == 1 ? " file" : " files")
            + " in " + (ms / 1000).toFixed(3) + "s by " + name);
    };
};

/**
 * Copies one or more files.
 * Any missing directories are created automatically.
 * @param {Array} files An array of strings specifying filenames to copy.
 * @param {String} files.dir An optional common parent directory. All filenames
 * in files are relative to it. Defaults to the project root.
 * @param {Object} options An optional object containing various options.
 * @param {String} options.to An optional target directory. The target
 * filenames are generated by resolving each filename from files relative to
 * options.to instead of files.dir. Defaults to the build directory.
 * @param {Function} options.filter An optional filter function which takes
 * the contents of a file as parameter and returns the filtered contents.
 * @param {Function} options.mapper An optional file name mapper.
 * It's a function which takes the original target file name (as computed by
 * files.dir and options.to) as parameter and returns the mapped file name.
 */
exports.copy = function(files, options) {
    var srcDir = files.dir || "";
    var destDir = options && options.to || exports.builddir;
    var mapper = options && options.mapper || _.identity;
    for (var i = 0; i < files.length; i++) {
        exports.copyFile(path.join(srcDir, files[i]),
                         mapper(path.join(destDir, files[i])), options);
    }
};

/**
 * Returns a combined handler and a combined filter function for a combination
 * of filename and options.
 * @param {String} filename The name of the target file.
 * @param {Object} options An optional object with options for copy or concat.
 * @param {Function} options.filter An optional filter function which takes
 * the contents of a file as parameter and returns the filtered contents.
 * @param {String} options.type An optional file type. Defaults to the file
 * extension of the destination.
 * @type Object
 * @returns An object with two methods: handler and filter.
 * handler should be called to generate dependencies. If filter is not null,
 * It should be called with the contents of the file as a string parameter.
 * It will then return the filtered file contents as a string.
 */
function getType(filename, options) {
    if (!options) options = {};
    var type = exports.fileType(options.type || path.extname(filename));
    var handlers = type.getHooks("handler");
    var filters = type.getHooks("filter", options.filter);
    return {
        handler: function(filename) {
            var obj = { type: type };
            for (var i = 0; i < handlers.length; i++) {
                handlers[i].call(obj, filename);
            }
        },
        filter: filters.length ? function(task, data, getSrc) {
            var obj = { type: type, task: task, getSrc: getSrc };
            for (var i = 0; i < filters.length; i++) {
                data = filters[i].call(obj, data);
            }
            return data;
        } : null
    };
}

/**
 * Wrapper around Jake's file() function.
 * @param {String} dest The destination file name.
 * @param {Array} deps An array with dependency names.
 * @param {Function} callback The callback parameter for file().
 * @param {Object} options An optional object with options for file().
 * @param {String} type An optional file type. Defaults to the file
 * extension of the destination.
 */
exports.file = function(dest, deps, callback, options, type) {
    if (typeof options !== "object") {
        type = options;
        options = {};
    }
    var dir = path.dirname(dest);
    directory(dir);
    file(dest, deps, function() {
        callback.apply(this, arguments);
        counter++;
    }, options);
    file(dest, [dir, "Jakefile.js"]);
    var obj = { type: exports.fileType(type || path.extname(dest)) };
    var handlers = obj.type.getHooks("handler");
    for (var i = 0; i < handlers.length; i++) handlers[i].call(obj, dest);
};

/**
 * Copies a single file.
 * Any missing directories are created automatically.
 * @param {String} src The filename of the source file.
 * @param {String} dest The filename of the target file.
 * @param {Object} options An optional object containing various options.
 * @param {Function} options.filter An optional filter function which takes
 * the contents of a file as parameter and returns the filtered contents.
 * @param {String} options.type An optional file type. Defaults to the file
 * extension of the destination.
 */
exports.copyFile = function(src, dest, options) {
    var type = getType(dest, options);
    var callback = type.filter ?
        function() {
            fs.writeFileSync(dest,
                type.filter(this, fs.readFileSync(src, "utf8"),
                    function(line) { return { name: src, line: line }; }));
        } : function() {
            var data = fs.readFileSync(src);
            fs.writeFileSync(dest, data, 0, data.length, null);
        };
    exports.file(dest, [src], callback, options && options.type);
};

/**
 * Concatenates one or more files and strings to a single file.
 * Any missing directories are created automatically.
 * @param {String} name The name of the destination file relative to the build
 * directory.
 * @param {Array} files An array of things to concatenate.
 * Plain strings are interpreted as filenames relative to files.dir,
 * objects having a method getData should return the contents as a string.
 * @param {String} files.dir An optional common parent directory. All filenames
 * in files are relative to it. Defaults to the project root.
 * @param {Object} options An optional object containing various options.
 * @param {String} options.to An optional target directory. The target
 * filenames are generated by resolving each filename from files relative to
 * options.to instead of files.dir. Defaults to the build directory.
 * @param {Function} options.filter An optional filter function which takes
 * the concatenated contents as parameter and returns the filtered contents.
 * @param {String} options.type An optional file type. Defaults to the file
 * extension of the destination.
 */
exports.concat = function(name, files, options) {
    var srcDir = files.dir || "";
    var dest = path.join(options && options.to || exports.builddir, name);
    var destDir = path.dirname(dest);
    var deps = [];
    var type = getType(dest, options);
    for (var i = 0; i < files.length; i++) {
        if (typeof files[i] == "string") deps.push(path.join(srcDir, files[i]));
    }
    deps.push(destDir);
    deps.push("Jakefile.js");
    directory(destDir);
    file(dest, deps, function() {
        var data = [];
        function fileDefs() {
            if (fileDefs.value) return fileDefs.value;
            fileDefs.value = [];
            var start = 0;
            for (var i = 0; i < data.length; i++) {
                fileDefs.value.push({
                    name: typeof files[i] !== "string" ? "" :
                        path.join(srcDir, files[i]),
                    start: start
                });
                start += data[i].split(/\r?\n|\r/g).length - 1;
            }
            return fileDefs.value;
        }
        function getSrc(line) {
            var defs = fileDefs();
            var def = defs[_.sortedIndex(defs, line, getStart) - 1];
            function getStart(x) {
                return typeof x == "number" ? x : x.start;
            }
            return { name: def.name, line: line - def.start };
        }
        if (type.filter) {
            for (var i = 0; i < files.length; i++) {
                var contents = typeof files[i] == "string" ?
                    fs.readFileSync(path.join(srcDir, files[i]), "utf8") :
                    files[i].getData();
                var last = contents.charAt(contents.length - 1);
                if (last != "\r" && last != "\n") contents += "\n";
                data.push(contents);
            }
            fs.writeFileSync(dest, type.filter(this, data.join(""), getSrc));
        } else {
            var fd = fs.openSync(dest, "w");
            for (var i = 0; i < files.length; i++) {
                var data = typeof files[i] == "string" ?
                    fs.readFileSync(path.join(srcDir, files[i])) :
                    new Buffer(files[i].getData());
                fs.writeSync(fd, data, 0, data.length, null);
            }
            fs.closeSync(fd);
        }
        counter++;
    });
    type.handler(dest);
};

/**
 * Converts a string to a pseudo-file for use by concat().
 * @param {String} s The string which should be inserted.
 * @type Object
 * @return An object which can be used as an element of the second parameter to
 * concat(). It has one method: getData(), which returns the string s.
 */
exports.string = function(s) { return { getData: function() { return s; } }; };

/**
 * Returns a list of filenames specified by a root directory and one or more
 * glob patterns.
 * @param {String} dir Optional root directory. Defaults to the project root.
 * @param {String or Array of String} globs One or more glob patterns.
 * @type Array of String
 * @returns An array of file names relative to dir, which match the specified
 * patterns.
 * The property dir is set to the parameter dir for use with copy and concat.
 */
exports.list = function(dir, globs) {
    if (globs === undefined) {
        globs = dir;
        dir = "";
    }
    if (typeof globs == "string") globs = [globs];
    var arrays = globs.map(function(s) { return globSync(dir, s); });
    var retval = Array.prototype.concat.apply([], arrays);
    retval.dir = dir;
    return retval;
};

/**
 * Asynchronously executes an external command.
 * stdin, stdout and stderr are passed through to the parent process.
 * @param {Array} The command to execute and its arguments.
 * @param {Object} options Options for child_process.spawn.
 * @param {Function} callback A callback which is called when the command
 * returns.
 */
exports.exec = function(command, options, callback) {
    if (!callback) {
        callback = options;
        options = undefined;
    };
    var child = child_process.spawn("/usr/bin/env", command, options);
    child.stdout.on("data", function(data) { process.stdout.write(data); });
    child.stderr.on("data", function(data) { process.stderr.write(data); });
    child.on("exit", callback);
};

exports.gzip = function(src, dest, callback) {
    var child = child_process.spawn("gzip", ["-nc", src]);
    child.stdout.pipe(fs.createWriteStream(dest));
    child.on("exit", callback);
};

/**
 * Merges two sorted arrays based on an optional comparison function
 * (like Array.prototype.sort).
 * @param {Array} a The first array.
 * @param {Array} b The second array.
 * @param {Function} cmp An optional comparison function like in Array.sort().
 * @type Array
 * @return A sorted array with elements from a and b, except for duplicates
 * from b. All entries from a are included. 
 */
exports.merge = function(a, b, cmp) {
    if (!cmp) cmp = function(x, y) { return x < y ? -1 : x > y ? 1 : 0; };
    var c = Array(a.length + b.length);
    var ai = 0, bi = 0, ci = 0;
    while (ai < a.length && bi < b.length) {
        var diff = cmp(a[ai], b[bi]);
        c[ci++] = diff > 0 ? b[bi++] : a[ai++];
        if (!diff) bi++;
    }
    while (ai < a.length) c[ci++] = a[ai++];
    while (bi < b.length) c[ci++] = b[bi++];
    c.length = ci;
    return c;
};

var includes = {};
var includesFile;

exports.includes = {

    /**
     * Specifies a file which stores include information between builds, and
     * loads it if it already exists.
     * @param {String} filename The file which stores include information
     * between builds.
     */
    load: function(filename) {
        includesFile = filename;
        if (path.existsSync(filename)) {
            includes = JSON.parse(fs.readFileSync(filename, "utf8"));
            for (var target in includes) {
                var inc = includes[target];
                file(target, inc.list);
                if (inc.type) {
                    getType(target, { type: inc.type }).handler(target);
                }
            }
        }
    },
    
    /**
     * Specifies which includes were found in a source file.
     * @param {String} file The target file which contains the results of
     * the inclusion.
     * @param {Array} includedFiles An array with names of included files.
     * @param {String} type An optional file type which can be used to
     * handle loaded files.
     */
    set: function(file, includedFiles, type) {
        includes[file] = { list: includedFiles };
        if (type) includes[file].type = type;
    },
    
    /**
     * Adds an include found in a source file.
     * @param {String} file The target file which contains the results of
     * the inclusion.
     * @param {String} include Name of the included file.
     */
    add: function(file, include) {
        if (!(file in includes)) includes[file] = { list: [] };
        includes[file].list.push(include);
    },
    
    /**
     * Saves the list of inlcudes to the file previously specified by
     * includes.load.
     */
    save: function() {
        for (var i in includes) {
            if (!includes[i].list.length) delete includes[i];
        }
        fs.writeFileSync(includesFile, JSON.stringify(includes));
    }
    
};

/**
 * A filter which processes //@include directives and takes care of dependencies
 */
exports.includeFilter = function (data) {
    var dest = this.task.name;
    exports.includes.set(dest, []);
    var self = this, line = 1;
    return data.replace(/(\/\/@include\s+(.*?)(\S*)(;?))?\r?\n/g,
        function(m, include, prefix, name, semicolon) {
            if (!include) {
                line++;
                return m;
            }
            var dir = path.dirname(self.getSrc(line).name);
            return (prefix || "") + exports.list(dir, name).map(function(file) {
                var include = path.join(dir, file);
                exports.includes.add(dest, include);
                return fs.readFileSync(include, "utf8");
            }).join("\n") + (semicolon + "\n");
        });
};
