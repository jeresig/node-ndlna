var ndlna = require("./ndlna");

ndlna.queryByName("東洲斎写楽", function(err, record) {
    console.log("DONE", record); 
});

//ndlna.queryByName("歌川, 国清", function(record) {
//    console.log("DONE", record); 
//});
