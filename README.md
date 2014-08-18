node-ndlna
==========

A Node library for resolving names through the [National Diet Library's Name Authority](http://id.ndl.go.jp/auth/ndlna). This utility exists as an alternative to simply querying using the [SPARQL endpoint](http://iss.ndl.go.jp/ndla/sparql/) as you can easily mix both English and Kanji forms of a name by querying the web service directly. Additionally search results and record results are heavily parsed and cached, to avoid performance hits from repeated usage.

This utility was created to correct artist names and generate bios for the [Ukiyo-e.org](http://ukiyo-e.org/) service, created by [John Resig](http://ejohn.org/). All code is available under an MIT license.

## Example Usage

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

Initialize the NDLNA connection (specifically loads the [`romaji-name`](https://www.npmjs.org/package/romaji-name) library for future name parsing). You should probably wait until `init` completes before completing any searches.

### .searchByName(name, callback)

Search for a person by name. The name can be in either English or Japanese (Kanji) - although you will get more results when searching in Kanji. The callback will have two arguments: An error object and a `Search` object.

## `Search`

The search results of the `searchByName` method.

### Properties:

* `.results` (Array): A collection of all the `Record`s returned from a search.

### Methods

#### `.load(callback)`

Calls `.load()` on all the result records. Is complete once all the results have been completely loaded.

## `Record`

A single record returned in the `Search` results.

### Properties:

* `.id`: A string holding the ID for the record.
* `.url`: A string holding the full URL of the record.
* `.viafURL`: The URL of the record in the VIAF database.
* `.name`: An object (returned from [`romaji-name`](https://www.npmjs.org/package/romaji-name)) representing the name in the record (potentially a mixture of both kanji and romaji).
* `.aliases[]`: An array of objects (returned from [`romaji-name`](https://www.npmjs.org/package/romaji-name)) representing the aliases in the record (potentially a mixture of both kanji and romaji).
* `.life`: An object (returned from [`yearrange`](https://www.npmjs.org/package/yearrange)) representing the lifespan of the individual.

### Methods

#### `.load(callback)`

Load a full record. Normally the results returned in a single `Search` result set are rather meager, with only the ID of the record being returned. Calling `.load()` on the record will load all the rest of the properties.