var Q = require('q');
var cheerio = require('cheerio');
var fs = require('fs');
var nomnom = require('nomnom');
var request = require('request');
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');

var main = function() {
    var opts = nomnom()
    .options({
        out: {
            abbr: 'o',
            help: 'output to the specified file instead of stdout',
            metavar: 'PATH'
        }
    })
    .parse();


    var url = 'https://explorecourses.stanford.edu/';
    request(url, function(error, response, body) {
        if (error) {
          console.error('Error: ' + error.message);
          console.error('Use --help for usage information');
        } else if (response.statusCode !== 200) {
            var err = (new Error('URL request gave a bad status code: ' + response.statusCode));
            onsole.error('Error: ' + err.message);
            console.error('Use --help for usage information');
        } else {
            var window = jsdom(body).defaultView;
            var regex = /\(([A-Z]*?)\)/g;
            var subjects = [];
            find(window.document.body, {
              document: window.document,
              find: regex,
              replace: function(portion, match) {
                var subject = match[1];
                if (subject.length!==0){
                  subjects.push(match[1]);
                }
              }
            });
            var stream = 'out' in opts ? fs.createWriteStream(opts.out) : process.stdout;
            stream.write(JSON.stringify(subjects));
            console.log("found " + subjects.length + " subjects");
        }
    });
};

main();
