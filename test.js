var ndlna = require("./ndlna");

// 東洲斎写楽

ndlna.init(function() {
    console.log("init");
    ndlna.searchByName("豊国 3世", function(err, search) {
        search.load(function() {
            console.log("DONE", search);
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