var request = require("request");
var libxmljs = require("libxmljs");
var romajiName = require("romaji-name");

var ndlQueryURL = "http://id.ndl.go.jp/auth/ndla/?g=personalNames&qw=";
var ndlnaURL = "http://id.ndl.go.jp/auth/ndlna/";
var viafRedirectURL = "http://viaf.org/viaf/sourceID/NDL%7C";

var extractNDLNA = /ndlna\/(\d+)/g;

var romajiNameLoaded = false;

var Record = function(id) {
    this.id = id;
    this.url = ndlnaURL + this.id;
};

Record.prototype = {
    loadData: function(callback) {
        if (this.loaded) {
            return callback();
        }

        request(this.url + ".rdf", function(err, res, body) {
            if (err || res.statusCode !== 200) {
                return callback(err);
            }

            // I hate namespaces
            body = body.replace(/<(\/?)\w+:/g, "<$1");

            var doc = libxmljs.parseXml(body);
            var prefLabel = doc.get("//prefLabel/Description");

            if (prefLabel) {
                var names = {};

                prefLabel.childNodes().forEach(function(node) {
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

                this.name = romajiName.parseName(name);
            }

            var birth = doc.get("//dateOfBirth");
            var death = doc.get("//dateOfDeath");

            if (birth || death) {
                this.life = {};

                if (birth) {
                    this.life.start = parseFloat(birth.text());
                }

                if (death) {
                    this.life.end = parseFloat(death.text());
                }
            }

            this.loaded = true;

            callback(null, this);
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

module.exports = {
    queryByName: function(name, callback) {
        // We need to make sure that romaji-name is loaded for all the
        // parsing that we're going to do.
        if (!romajiNameLoaded) {
            romajiName.init(function() {
                romajiNameLoaded = true;

                // Re-run the query once romaji-name is loaded
                this.queryByName(name, callback);
            }.bind(this));

            return;
        }

        // TODO: Figure out the SPARQL and run it through their API instead
        request(ndlQueryURL + encodeURIComponent(name), function(err, res, body) {
            if (err || res.statusCode !== 200) {
                return callback(err);
            }

            var matches = body.match(extractNDLNA);
            if (matches.length === 0) {
                return callback();
            }

            var record = new Record(matches[0].split("/")[1]);
            record.loadData(function() {
                callback(null, record);
            });
        });
    }
};
