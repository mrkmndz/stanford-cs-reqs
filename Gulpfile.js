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

var URL_TO_SCRAPE = 'https://explorecourses.stanford.edu/print?q=CS&descriptions=on&filter-term-Winter=off&academicYear=&filter-term-Summer=off&filter-term-Autumn=off&filter-departmentcode-CS=on&filter-term-Spring=off&page=0&filter-coursestatus-Active=on&catalog=';

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

var extractCommand = 'node src/extract-courses.js -o build/courses.json -u "' + URL_TO_SCRAPE + '"';
if (opts['use-cached']) {
    gulp.task('scrape-courses', function() {
        // no-op since we're using cached courses
    });
} else {
    gulp.task('scrape-courses', ['build-dir'], shell.task(extractCommand));
}

gulp.task('inject-class-data', ['scrape-courses'], function(cb){
  fs.readFile('build/courses.json', function(error, data){
    if (error){
      cb(error);
    } else {
      var courses = JSON.parse(data);
      request("https://web.stanford.edu/group/ughb/cgi-bin/handbook/index.php/Computer_Science_Program",
      function(error, response, body) {
          if (error) {
              cb(error);
          } else if (response.statusCode !== 200) {
              cb(new Error('URL request gave a bad status code: ' + response.statusCode));
          } else {

            var window = jsdom(body).defaultView;

            wrapper = window.document.createElement('span');
            wrapper.className = 'course';
            find(window.document.body, {
                find: /(CS ?)?\d\d*[a-zA-Z]?/g,
                wrap: wrapper,
                document: window.document
            });
            fs.writeFile('./build/shoob.html', window.document.documentElement.outerHTML, cb);
          }
      });
    }
  });
});

gulp.task('vendor-js', function() {
    return gulp.src('src/vendor/**/*.js')
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('css', function() {
    return gulp.src(['./src/vendor/**/*.css', './src/client/**/*.css'])
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('js', ['inject-class-data'], function() {
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
