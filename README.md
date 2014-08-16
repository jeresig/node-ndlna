node-ndlna
==========

Resolve names through the National Diet Library's Name Authority.

## Example

    var ndlna = require("ndlna");
    
    ndlna.init(function() {
        ndlna.searchByName("hiroshige", function(err, search) {
            search.load(function() {
                search.results.forEach(function(record) {
                    console.log("ID:", record.id);
                    console.log("URL:", record.url);
                    console.log("Name:", record.name);
                    console.log("Aliases:", record.aliases);
                    console.log("Life:", record.life);
                    console.log("VIAF URL:", record.viafURL);
                });
            });
        });
    });

## Methods

### init(callback)

Initialize the NDLNA connection (specifically loads the `romaji-name` library for future name parsing). You should probably wait until `init` completes before completing any searches.

### searchByName(name, callback)

Search for a person by name. The name can be in either English or Japanese (Kanji) - although you will get more results when searching in Kanji. The callback will have two arguments: An error object and a `Search` object.


## `Search`

## `Record`

