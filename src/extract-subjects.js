var Q = require('q');
var http = require("q-io/http");
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');

module.exports = function(url) {
  return http.read(url).then(function(body){
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
  });
};
