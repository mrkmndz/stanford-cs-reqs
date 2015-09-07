var Q = require('q');
var fs = require("q-io/fs");
var http = require("q-io/http");
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');
var nomnom = require('nomnom');

var courseString = '\\d+[a-zA-Z]?';

module.exports = function(coursesPath, subjectsPath, programHTML) {
  return Q.spread(
  [fs.read(coursesPath),
    fs.read(subjectsPath),
    http.read(programHTML)],
  produceHTML)
  .catch(function (error) {
      console.error('Error: ' + error.message);
      console.error('Use --help for usage information');
  });
};

var produceHTML = function(coursesJSON,subjectsJSON,syllabusHTML){
  var courses = JSON.parse(coursesJSON);
  var subjects = JSON.parse(subjectsJSON);
  var window = jsdom(syllabusHTML).defaultView;

  var classNumberToClass = {};
  courses.forEach(function(datum) {
      var number = datum.number;
      // strip out spaces to normalize
      number = number.replace(' ', '');
      classNumberToClass[number] = datum;
  });

  subjects.forEach(function(subject){
    var regexString = subject + '(?:\\s|'+courseString+'|,|;|&)+';
    var regex = new RegExp(regexString, 'g');
    find(window.document.body, {
      document: window.document,
      find: regex,
      replace: wrapNumbersWithCourseSpans(window.document, subject, classNumberToClass)
    });
  });

  return window.document.documentElement.outerHTML;
};

var wrapNumbersWithCourseSpans = function(doc, subject, classNumberToClass){
  return function(portion,match){
    var frame = doc.createElement('span');
    var re = new RegExp(courseString, 'g');
    var str = portion.text;
    var captured = 0;
    while ((myArray = re.exec(str)) !== null) {
      var course = classNumberToClass[subject + myArray[0]];
      frame.appendChild(doc.createTextNode(str.substring(captured,myArray.index)));
      captured = myArray.index+myArray[0].length;
      if (course !== undefined){
        var wrapper = doc.createElement('span');
        wrapper.className = 'course';
        wrapper.setAttribute('data-course' ,JSON.stringify(course) );
        wrapper.textContent = myArray[0];
        frame.appendChild(wrapper);
      } else {
        frame.appendChild(doc.createTextNode(myArray[0]));
      }
    }
    frame.appendChild(doc.createTextNode(str.substring(captured)));
    return frame;
  };
};
