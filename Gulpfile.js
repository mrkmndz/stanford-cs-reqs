var browserify = require('gulp-browserify');
var cheerio = require('cheerio');
var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var mkdirp = require('mkdirp');
var jsdom = require('jsdom').jsdom;
var find = require('../findAndReplaceDOMText/src/findAndReplaceDOMText.js');
var Q = require('q');
var fs = require("q-io/fs");

var scrapeSubjects = require('./src/extract-subjects');
var extractCourses = require('./src/extract-courses');
var makeDocument = require('./src/inject-class-data');

gulp.task('clean-build', function(cb) {
    del(['build'], cb);
});

gulp.task('build-dir', ['clean-build'], function(cb) {
    mkdirp('build', cb);
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

gulp.task('scrape-courses', ['build-dir'], function(cb){
  scrapeSubjects('https://explorecourses.stanford.edu/')
  .then(function(subjects){
    var writingSubjects = fs.write('./build/subjects.json', JSON.stringify(subjects));
    var writingCourses = extractCourses(subjects).then(function(courses){
      var jsonString = JSON.stringify(courses, null, 4) + '\n';
      return fs.write('./build/courses.json',jsonString);
    });
    return Q.all([writingSubjects,writingCourses]);
  }).then(function(array){
    cb();
  }).catch(cb);
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

    return fs.write('./dist/index.html', $.html());
  }).then(function(write){
    cb();
  }).catch(cb);
});
