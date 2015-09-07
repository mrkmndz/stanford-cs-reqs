var Q = require('q');
var cheerio = require('cheerio');
var fs = require('fs');
var nomnom = require('nomnom');
var request = require('request');

module.exports = function(subjects) {
    var promises = [];
    subjects.forEach(function(subject){
      var url = 'https://explorecourses.stanford.edu/print'+
      '?q=' + subject +
      '&descriptions=on' +
      '&filter-term-Winter=off'+
      '&academicYear='+
      '&filter-term-Summer=off'+
      '&filter-term-Autumn=off'+
      '&filter-departmentcode-'+ subject +'=on'+
      '&filter-term-Spring=off'+
      '&page=0'+
      '&filter-coursestatus-Active=on'+
      '&catalog=';
      promises.push(
        fetchHtmlFromUrl(url)
        .then(extractCoursesFromHtml)
        .catch(errorHandler)
      );
    });

    return Q.all(promises).then(function(array){
      var courses = [].concat.apply([], arrays);
      console.log('Extracted ' + courses.length + ' courses');
      return courses;
    }).catch(function (error) {
        console.error('Error: ' + error.message);
        console.error('Use --help for usage information');
    });
};

var fetchHtmlFromUrl = function(url) {
    var deferred = Q.defer();
    request(url, function(error, response, body) {
        if (error) {
            deferred.reject(error);
        } else if (response.statusCode !== 200) {
            deferred.reject(new Error('URL request gave a bad status code: ' + response.statusCode));
        } else {
            deferred.resolve(body);
        }
    });

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
