var ndlna = require("./ndlna");

// 東洲斎写楽

ndlna.init(function() {
    console.log("init");
    // 豊国 3世
    ndlna.searchByName("hiroshige", function(err, search) {
        var filtered = search.results.filter(function(record) {
            return /1[678]\d\d/.test(record.label);
        });

        var match;

        if (filtered.length > 0) {
            match = filtered[0];
        } else if (search.results.length > 0) {
            match = search.results[0];
        }

        search.load(function() {
            console.log("DONE", search);
            console.log("MATCH", match);
        });
    });
});

//ndlna.queryByName("歌川, 国清", function(record) {
//    console.log("DONE", record);
//});

/*
        { original: '歌川 国郷',
          locale: 'ja',
          kanji: '歌川国郷',
          surname_kanji: '歌川',
          given_kanji: '国郷' }
*/