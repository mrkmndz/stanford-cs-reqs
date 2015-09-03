var browserify = require('gulp-browserify');
var cheerio = require('cheerio');
var concat = require('gulp-concat');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var mkdirp = require('mkdirp');
var nomnom = require('nomnom');
var shell = require('gulp-shell');
var request = require('request');
var jsdom = require('jsdom').jsdom;
var find = require('../findAndReplaceDOMText/src/findAndReplaceDOMText.js');

var opts = nomnom
.options({
    'use-cached': {
        abbr: 'c',
        help: 'don\'t fetch new course information',
        flag: true
    }
})
.parse();
gulp.task('clean-build', function(cb) {
    del(['build'], cb);
});

gulp.task('clean-dist', function(cb) {
    del(['dist'], cb);
});

gulp.task('build-dir', ['clean-build'], function(cb) {
    mkdirp('build', cb);
});

gulp.task('dist-dir', ['clean-dist'], function(cb) {
    mkdirp('dist', cb);
});

gulp.task('scrape-subjects',['build-dir'],
  shell.task('node src/extract-subjects.js -o build/subjects.json')
);

var extractCommand = 'node src/extract-courses.js -o build/courses.json';
if (opts['use-cached']) {
    gulp.task('scrape-courses', function() {
        // no-op since we're using cached courses
    });
} else {
    gulp.task('scrape-courses', ['scrape-subjects','build-dir'], shell.task(extractCommand));
}

gulp.task('inject-class-data', ['scrape-courses'], function(cb){
  fs.readFile('build/courses.json', function(error, data){
    if (error){
      cb(error);
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
          cb(error);
        } else {
          var subjects = JSON.parse(data);
      request("https://web.stanford.edu/group/ughb/cgi-bin/handbook/index.php/Computer_Science_Program",
      function(error, response, body) {
          if (error) {
              cb(error);
          } else if (response.statusCode !== 200) {
              cb(new Error('URL request gave a bad status code: ' + response.statusCode));
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
            fs.writeFile('./build/shoob.html', window.document.documentElement.outerHTML, cb);
          }
      });
      }
    });
    }
  });
});

gulp.task('vendor-js', ['dist-dir'], function() {
    return gulp.src('src/vendor/**/*.js')
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('css', ['dist-dir'], function() {
    return gulp.src(['./src/vendor/**/*.css', './src/client/**/*.css'])
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('js', ['dist-dir','inject-class-data'], function() {
    return gulp.src('./src/client/main.js')
    .pipe(browserify())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('generate-client', ['dist-dir', 'css', 'js', 'vendor-js'], function(cb) {
    fs.readFile('./build/shoob.html', function(error, data) {
        if (error) {
            cb(error);
        } else {
            var modifyHtmlAndWrite = function(toAppend) {
                var $ = cheerio.load(data.toString(), {
                    decodeEntities: false
                });
                var head = $('head');
                head.append('<script src="vendor.js" type="text/javascript"></script>');
                head.append('<link rel="stylesheet" type="text/css" href="styles.css">');
                head.children('title').text('Stanford CS Requirements');
                if (toAppend) {
                    head.append(toAppend);
                }

                var body = $('body');
                body.append('<script src="main.js" type="text/javascript"></script>');
                fs.writeFile('./dist/index.html', $.html(), cb);
            };

            var appendToHeadPath = './append-to-head.txt';
            fs.exists(appendToHeadPath, function(exists) {
                if (exists) {
                    fs.readFile(appendToHeadPath, function(err, appendData) {
                        if (err) {
                            cb(err);
                        } else {
                            modifyHtmlAndWrite(appendData.toString());
                        }
                    });
                } else {
                    modifyHtmlAndWrite();
                }
            });
        }
    });
});
