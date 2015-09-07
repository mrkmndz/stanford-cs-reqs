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

gulp.task('clean-build', function(cb) {
    del(['build'], cb);
});

gulp.task('build-dir', ['clean-build'], function(cb) {
    mkdirp('build', cb);
});

gulp.task('scrape-subjects',['build-dir'],
  shell.task('node src/extract-subjects.js -o build/subjects.json')
);

gulp.task('scrape-courses', ['scrape-subjects','build-dir'],
  shell.task('node src/extract-courses.js -o build/courses.json')
);

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

gulp.task('inject-class-data',
  shell.task(' -o build/shoob.html')
);

gulp.task('generate-client', ['dist-dir', 'css', 'js', 'vendor-js'], function(cb) {
   exec('node src/inject-class-data.js', function (err, stdout, stderr) {
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
