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
var exec = require('child_process').exec;

var scrapeSubjects = require('./src/extract-subjects');
var extractCourses = require('./src/extract-subjects');
var makeDocument = require('./src/inject-class-data');

gulp.task('clean-build', function(cb) {
    del(['build'], cb);
});

gulp.task('build-dir', ['clean-build'], function(cb) {
    mkdirp('build', cb);
});

gulp.task('scrape-courses', ['scrape-subjects','build-dir'], function(cb){
  var subjects = scrapeSubjects('https://explorecourses.stanford.edu/');
  var courses = extractCourses(subjects);
  var jsonString = JSON.stringify(courses, null, 4) + '\n';

  fs.writeFile('/build/subjects.json', JSON.stringify(subjects), cb);
  fs.writeFile('/build/courses.json', jsonString, cb);
});

gulp.task('clean-dist', function(cb) {
    del(['dist'], cb);
});

gulp.task('dist-dir', ['clean-dist'], function(cb) {
    mkdirp('dist', cb);
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

gulp.task('js', ['dist-dir'], function() {
    return gulp.src('./src/client/main.js')
    .pipe(browserify())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('generate-client', ['dist-dir', 'css', 'js', 'vendor-js'], function(cb) {
  var html = makeDocument('build/courses.json','build/subjects.json','https://web.stanford.edu/group/ughb/cgi-bin/handbook/index.php/Computer_Science_Program');
  html.then(function(rawHTML){
    var $ = cheerio.load(rawHTML, {
        decodeEntities: false
    });

    var head = $('head');
    head.append('<script src="vendor.js" type="text/javascript"></script>');
    head.append('<link rel="stylesheet" type="text/css" href="styles.css">');
    head.children('title').text('Stanford CS Requirements');

    var body = $('body');
    body.append('<script src="main.js" type="text/javascript"></script>');

    fs.writeFile('./dist/index.html', $.html(), cb);
  }).catch(
    function(error){
      console.error('Error: ' + error.message);
    }
  );
});
