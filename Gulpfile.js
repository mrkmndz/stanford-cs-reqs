var browserify = require('gulp-browserify');
var cheerio = require('cheerio');
var concat = require('gulp-concat');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var mkdirp = require('mkdirp');
var nomnom = require('nomnom');
var shell = require('gulp-shell');

var opts = nomnom
.options({
    'use-cached': {
        abbr: 'c',
        help: 'don\'t fetch new course information',
        flag: true
    }
})
.parse();

var URL_TO_SCRAPE = 'https://explorecourses.stanford.edu/print?filter-term-Autumn=on&filter-term-Summer=on&page=0&q=CS&filter-coursestatus-Active=on&descriptions=on&filter-term-Spring=on&filter-departmentcode-CS=on&filter-catalognumber-CS=on&collapse=&filter-term-Winter=on&academicYear=&catalog=';

gulp.task('clean-build', function(cb) {
    del(['build'], cb);
});

gulp.task('clean-dist', function(cb) {
    del(['dist'], cb);
});

gulp.task('build-dir', ['clean-build'], function(cb) {
    mkdirp('build', cb)
})

gulp.task('dist-dir', ['clean-dist'], function(cb) {
    mkdirp('dist', cb)
})

var extractCommand = 'node src/extract-courses.js -o build/courses.json -u "' + URL_TO_SCRAPE + '"';
if (opts['use-cached']) {
    gulp.task('scrape-courses', function() {
        // no-op since we're using cached courses
    });
} else {
    gulp.task('scrape-courses', ['build-dir'], shell.task(extractCommand));
}

gulp.task('vendor-js', function() {
    return gulp.src('src/vendor/**/*.js')
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('css', function() {
    return gulp.src(['./src/vendor/**/*.css', './src/client/**/*.css'])
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('./dist/'));
})

gulp.task('js', ['scrape-courses'], function() {
    return gulp.src('./src/client/main.js')
    .pipe(browserify())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('generate-client', ['dist-dir', 'css', 'js', 'vendor-js'], function(cb) {
    fs.readFile('./data/specializations.html', function(error, data) {
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
            }

            var appendToHeadPath = './append-to-head.txt';
            fs.exists(appendToHeadPath, function(exists) {
                if (exists) {
                    fs.readFile(appendToHeadPath, function(err, appendData) {
                        if (err) {
                            cb(err);
                        } else {
                            modifyHtmlAndWrite(appendData.toString());
                        }
                    })
                } else {
                    modifyHtmlAndWrite();
                }
            });
        }
    });
});
