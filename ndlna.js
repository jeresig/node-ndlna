var request = require("request");
var libxmljs = require("libxmljs");
var dirty = require("dirty");
var async = require("async");
var romajiName = require("romaji-name");

var searchCacheFile = __dirname + "/search-cache.db";
var recordCacheFile = __dirname + "/record-cache.db";

var ndlQueryURL = "http://id.ndl.go.jp/auth/ndla/?g=personalNames&qw=";
var ndlnaURL = "http://id.ndl.go.jp/auth/ndlna/";
var viafRedirectURL = "http://viaf.org/viaf/sourceID/NDL%7C";

var extractNDLNA = /ndlna\/(\d+)/g;

var searchCache;
var recordCache = dirty(recordCacheFile);

var Record = function(id) {
    this.id = id;
    this.url = ndlnaURL + this.id;
};

Record.prototype = {
    parseLabel: function(label) {
        var names = {};

        label.childNodes().forEach(function(node) {
            var lang = node.attr("lang");
            lang = lang ? lang.value() : "ja-Kanji";

            var text = node.text().trim();

            if (text) {
                names[lang] = text.split(/, /).slice(0, 2).join(" ")
                    .replace(/[ \d-]+$/, "");
            }
        });

        var name = names["ja-Kanji"];

        if (names["ja-Latn"]) {
            name += " " + names["ja-Latn"];
        }

        return romajiName.parseName(name);
    },

    load: function(callback) {
        var cached = recordCache.get(this.id);

        if (cached) {
            for (var prop in cached) {
                this[prop] = cached[prop];
            }
            callback(null, this);
            return;
        }

        request(this.url + ".rdf", function(err, res, body) {
            if (err || res.statusCode !== 200) {
                return callback(err);
            }

            var cache = {};

            // I hate namespaces
            body = body.replace(/<(\/?)\w+:/g, "<$1");

            var doc = libxmljs.parseXml(body);
            var prefLabel = doc.get("//prefLabel/Description");

            if (prefLabel) {
                cache.name = this.name = this.parseLabel(prefLabel);
            }

            cache.aliases = this.aliases = [];

            var altLabels = doc.find("//altLabel/Description");

            altLabels.forEach(function(label) {
                var name = this.parseLabel(label);
                if (name.name) {
                    this.aliases.push(name);
                }
            }.bind(this));

            var birth = doc.get("//dateOfBirth");
            var death = doc.get("//dateOfDeath");

            if (birth || death) {
                cache.life = this.life = {};

                if (birth) {
                    this.life.start = parseFloat(birth.text());
                }

                if (death) {
                    this.life.end = parseFloat(death.text());
                }
            }

            this.getVIAFUrl(function() {
                if (this.viafURL) {
                    cache.viafURL = this.viafURL;
                }

                recordCache.set(this.id, cache);

                callback(null, this);
            }.bind(this));
        }.bind(this));
    },

    getVIAFUrl: function(callback) {
        if (this.viafURL) {
            return callback(null, this.viafURL);
        }

        request.head(viafRedirectURL + this.id, function(err, res) {
            if (err) {
                return callback(err);
            }

            this.viafURL = res.request.href;
            callback(null, this.viafURL);
        }.bind(this));
    }
};

var Search = function(options) {
    this.results = [];
};

Search.prototype = {
    maxRecordLoad: 4,

    byName: function(name, callback) {
        var cached = searchCache.get(name);

        if (cached) {
            this.results = cached.results.map(function(id) {
                return new Record(id);
            });
            callback(null, this);
            return;
        }

        // TODO: Figure out the SPARQL and run it through their API instead
        request(ndlQueryURL + encodeURIComponent(name), function(err, res, body) {
            var cache = {};
            var ids = [];

            if (!err && res.statusCode === 200) {
                ids = body.match(extractNDLNA).map(function(url) {
                    return url.split("/")[1];
                });
            }

            this.results = ids.map(function(id) {
                return new Record(id);
            });

            cache.results = ids;

            searchCache.set(name, cache, function() {
                callback(null, this);
            }.bind(this));
        }.bind(this));
    },

    load: function(callback) {
        async.eachLimit(this.results, this.maxRecordLoad,
            function(record, callback) {
                record.load(callback);
            }, function() {
                callback(null, this);
            }.bind(this));
    }
};

module.exports = {
    init: function(callback) {
        async.parallel([
            function(callback) {
                romajiName.init(callback);
            },
            function(callback) {
                searchCache = dirty(searchCacheFile);
                searchCache.on("load", callback);
            },
            function(callback) {
                recordCache = dirty(recordCacheFile);
                recordCache.on("load", callback);
            }
        ], callback);
    },

    searchByName: function(name, callback) {
        return (new Search()).byName(name, callback);
    }
};
