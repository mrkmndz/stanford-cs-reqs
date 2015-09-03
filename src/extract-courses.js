var Q = require('q');
var cheerio = require('cheerio');
var fs = require('fs');
var nomnom = require('nomnom');
var request = require('request');

var main = function() {
    var opts = nomnom()
    .options({
        file: {
            abbr: 'f',
            help: 'parse HTML from an input file',
            metavar: 'PATH'
        },
        url: {
            abbr: 'u',
            help: 'parse HTML from a URL',
            metavar: 'URL'
        },
        out: {
            abbr: 'o',
            help: 'output to the specified file instead of stdout',
            metavar: 'PATH'
        }
    })
    .parse();

    fetchHtmlFromArgs(opts)
    .then(extractCoursesFromHtml)
    .then(outputData(opts))
    .catch(function (error) {
        console.error('Error: ' + error.message);
        console.error('Use --help for usage information');
    })
    .done();
};

var fetchHtmlFromArgs = function(opts) {
    var deferred = Q.defer();
    if ('file' in opts) {
        var filename = opts.file;
        fs.readFile(filename, function(error, text) {
            if (error) {
                deferred.reject(new Error(error));
            } else {
                deferred.resolve(text.toString());
            }
        });
    } else if ('url' in opts) {
        var url = opts.url;
        request(url, function(error, response, body) {
            if (error) {
                deferred.reject(error);
            } else if (response.statusCode !== 200) {
                deferred.reject(new Error('URL request gave a bad status code: ' + response.statusCode));
            } else {
                deferred.resolve(body);
            }
        });
    } else {
        deferred.reject(new Error('No input source was provided. Please provide a filename or URL.'));
    }

    return deferred.promise;
};

var extractCoursesFromHtml = function(rawHtml) {
    var SPLIT_MAP = {
        "Terms": ",",
        "Instructors": ";"
    };

    var $ = cheerio.load(rawHtml);
    var courses = [];
    $('.searchResult').each(function(i, el) {
        var $el = $(el);
        var $courseInfo = $el.children('.courseInfo');
        var course = {};
        course.number = $courseInfo.find('.courseNumber').first().text().split(':')[0];
        course.title = $courseInfo.find('.courseTitle').first().text();

        $el.children('.courseAttributes').each(function() {
            augmentCourseWithAttributes(course, $(this));
        });
        courses.push(course);
    });

    return courses;

    function augmentCourseWithAttributes(course, $el) {
        var attributes = $el.text().split('|');
        attributes.forEach(function(attribute) {
            attribute = attribute.trim();
            var split = attribute.split(':');
            if (split.length >= 2) {
                var key = split[0];
                var value = split[1].trim();
                if (key in SPLIT_MAP) {
                    value = value.split(SPLIT_MAP[key]);
                    value = value.map(function(item) {
                        return item.trim();
                    });
                    value = value.filter(function(item) {
                        return item.length > 0;
                    });
                }
                course[key] = value;
            }
        });
    }
};


var outputData = function(opts) {
    var stream = 'out' in opts ? fs.createWriteStream(opts.out) : process.stdout;

    return function(courses) {
        console.log('Extracted ' + courses.length + ' courses');
        var jsonString = JSON.stringify(courses, null, 4) + '\n';
        stream.write(jsonString);
    };
};

main();
