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

### .init(callback)

Initialize the NDLNA connection (specifically loads the `romaji-name` library for future name parsing). You should probably wait until `init` completes before completing any searches.

### .searchByName(name, callback)

Search for a person by name. The name can be in either English or Japanese (Kanji) - although you will get more results when searching in Kanji. The callback will have two arguments: An error object and a `Search` object.

## `Search`

The search results of the `searchByName` method.

### Properties:

* `.results` (Array): A collection of all the `Record`s returned from a search.

### `.load(callback)`

Calls `.load()` on all the result records. Is complete once all the results have been completely loaded.

## `Record`

A single record returned in the `Search` results.

### Properties:

* `.id`: A string holding the ID for the record.
* `.url`: A string holding the full URL of the record.
* `.viafURL`: The URL of the record in the VIAF database.
* `.name`: An object (returned from `romaji-name`) representing the name in the record (potentially a mixture of both kanji and romaji).
* `.aliases[]`: An array of objects (returned from `romaji-name`) representing the aliases in the record (potentially a mixture of both kanji and romaji).
* `.life`: An object (returned from `yearrange`) representing the lifespan of the individual.

### `.load(callback)`

Load a full record. Normally the results returned in a single `Search` result set are rather meager, with only the ID of the record being returned. Calling `.load()` on the record will load all the rest of the properties.