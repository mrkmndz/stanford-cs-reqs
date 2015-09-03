var fs = require('fs');
var request = require('request');
var jsdom = require('jsdom').jsdom;
var find = require('../../findAndReplaceDOMText/src/findAndReplaceDOMText.js');
var nomnom = require('nomnom');

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

  var errorHandler = function (error) {
      console.error('Error: ' + error.message);
      console.error('Use --help for usage information');
  };
  fs.readFile('build/courses.json', function(error, data){
    if (error){
      errorHandler(error);
    } else {
      var courses = JSON.parse(data);
      var classNumberToClass = {};
      courses.forEach(function(datum) {
          var number = datum.number;
          // strip out spaces to normalize
          number = number.replace(' ', '');
          classNumberToClass[number] = datum;
      });
      fs.readFile('build/subjects.json',function(error,data){
        if (error){
          errorHandler(error);
        } else {
          var subjects = JSON.parse(data);
      request("https://web.stanford.edu/group/ughb/cgi-bin/handbook/index.php/Computer_Science_Program",
      function(error, response, body) {
          if (error) {
              errorHandler(error);
          } else if (response.statusCode !== 200) {
              errorHandler(new Error('URL request gave a bad status code: ' + response.statusCode));
          } else {

            var window = jsdom(body).defaultView;
            subjects.forEach(function(subject){
            var courseString = '\\d+[a-zA-Z]?';
            var regexString = subject + '(?:\\s|'+courseString+'|,|;|&)+';
            var regex = new RegExp(regexString, 'g');
            find(window.document.body, {
                document: window.document,
                find: regex,
                replace: function(portion, match) {
                  var frame = window.document.createElement('span');
                  var re = new RegExp(courseString, 'g');
                  var str = portion.text;
                  var captured = 0;
                  while ((myArray = re.exec(str)) !== null) {
                    var course = classNumberToClass[subject + myArray[0]];
                    frame.appendChild(window.document.createTextNode(str.substring(captured,myArray.index)));
                    captured = myArray.index+myArray[0].length;
                    if (course !== undefined){
                      var wrapper = window.document.createElement('span');
                      wrapper.className = 'course';
                      wrapper.setAttribute('data-course' ,JSON.stringify(course) );
                      wrapper.textContent = myArray[0];
                      frame.appendChild(wrapper);
                    } else {
                      frame.appendChild(window.document.createTextNode(myArray[0]));
                    }
                  }
                  frame.appendChild(window.document.createTextNode(str.substring(captured)));
                  return frame;
                },
            });
          });
          var stream = 'out' in opts ? fs.createWriteStream(opts.out) : process.stdout;
          stream.write(window.document.documentElement.outerHTML);
          }
      });
      }
    });
    }
  });
};

main();
