var request = require("request");
var {DOMParser} = require("xmldom");
var xpath = require("xpath");
var dirty = require("dirty");
var async = require("async");
var romajiName = require("romaji-name");

var searchCacheFile = __dirname + "/search-cache.db";
var recordCacheFile = __dirname + "/record-cache.db";

var ndlQueryURL = "http://id.ndl.go.jp/auth/ndla/?g=personalNames&qw=";
var ndlnaURL = "http://id.ndl.go.jp/auth/ndlna/";
var viafRedirectURL = "http://viaf.org/viaf/sourceID/NDL%7C";

var extractNDLNA = "//li/a[contains(@href,'auth/ndlna')]";

var searchCache;
var recordCache = dirty(recordCacheFile);

var Record = function(id, label) {
    this.id = id;
    this.url = ndlnaURL + this.id;
    if (label) {
        this.label = label;
    }
};

Record.prototype = {
    parseLabel: function(label) {
        var names = {};

        Array.from(label.childNodes).forEach(function(node) {
            var lang = node.getAttribute && node.getAttribute("lang") || "ja-Kanji";
            var text = node.textContent.trim();

            if (text) {
                names[lang] = text.split(/, /).slice(0, 2).join(" ")
                    .replace(/[ \d-]+$/, "");
            }
        });

        var name = names["ja-Kanji"];

        // Sometimes it ends with something like 江戸後期
        name = name.replace(/(?:江戸|文久|\S+頃|-\d+).*$/, "");

        if (names["ja-Latn"]) {
            name += " " + names["ja-Latn"]
                .replace(/ (?:Edo|Bunkyu|\S+ goro|-\d+).*$/, "");
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

            var doc = new DOMParser().parseFromString(body);
            var prefLabel = xpath.select1("//prefLabel/Description", doc);

            if (prefLabel) {
                cache.name = this.name = this.parseLabel(prefLabel);
            }

            cache.aliases = this.aliases = [];

            var altLabels = xpath.select("//altLabel/Description", doc);

            altLabels.forEach(function(label) {
                var name = this.parseLabel(label);
                if (name.name) {
                    this.aliases.push(name);
                }
            }.bind(this));

            var birth = xpath.select1("//dateOfBirth", doc);
            var death = xpath.select1("//dateOfDeath", doc);

            if (birth || death) {
                cache.life = this.life = {};

                if (birth) {
                    this.life.start = parseFloat(birth.textContent);
                }

                if (death) {
                    this.life.end = parseFloat(death.textContent);
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
            this.results = cached.results.map(function(match) {
                return new Record(match.id, match.label);
            });
            callback(null, this);
            return;
        }

        // TODO: Figure out the SPARQL and run it through their API instead
        request(ndlQueryURL + encodeURIComponent(name), function(err, res, body) {
            var cache = {};
            var matches = [];

            if (!err && res.statusCode === 200) {
                body = body.replace(/xmlns=".*?"/, "");
                var doc = new DOMParser().parseFromString(body);
                var links = xpath.select(extractNDLNA, doc);
                matches = links.map(function(link) {
                    var url = link.getAttribute("href");
                    return {
                        id: /\d+/.exec(url)[0],
                        label: link.textContent
                    };
                });
            }

            this.results = matches.map(function(match) {
                return new Record(match.id, match.label);
            });

            cache.results = matches;

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
