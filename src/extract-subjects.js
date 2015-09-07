var Q = require('q');
var cheerio = require('cheerio');
var fs = require('fs');
var nomnom = require('nomnom');
var request = require('request');
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');

module.exports = function(url) {
  request(url, function(error, response, body) {
      if (error) {
        console.error('Error: ' + error.message);
        console.error('Use --help for usage information');
      } else if (response.statusCode !== 200) {
          var err = (new Error('URL request gave a bad status code: ' + response.statusCode));
          console.error('Error: ' + err.message);
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
          console.log("found " + subjects.length + " subjects");
          return subjects;
      }
  });
};
