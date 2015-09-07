var Q = require('q');
var fs = require("q-io/fs");
var http = require("q-io/http");
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');
var nomnom = require('nomnom');

var courseString = '\\d+[a-zA-Z]?';

var main = function() {
    var opts = {};
  opts = nomnom()
  .options({
      out: {
          abbr: 'o',
          help: 'output to the specified file instead of stdout',
          metavar: 'PATH'
      }
  })
  .parse();

  var errorHandler = function (error) {
      console.error('Error: ' + error.message);
      console.error('Use --help for usage information');
  };
  var producedHTML = Q.spread(
  [fs.read('build/courses.json'),
    fs.read('build/subjects.json'),
    http.read("https://web.stanford.edu/group/ughb/cgi-bin/handbook/index.php/Computer_Science_Program")],
  produceHTML);
  Q.spread([openStream(opts),producedHTML],writeToStream)
  .catch(errorHandler);
};

var openStream = function(options){
  if ('out' in options){
    return fs.open(options.out,'w');
  } else {
    return  Q.fcall(function () {
      return process.stdout;
    });
  }
};

var writeToStream = function(stream,rawHTML){
  stream.write(rawHTML);
  return stream.flush;
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

main();
