# Stanford CS MS Specialization Requirements

## Background

I started trying to choose a CS specialization, which involves looking at long lists of course numbers. Since I barely knew which classes were associated with which numbers, I found myself constantly looking them up to see what I'd be most interested in. What I really wanted was to be able to hover over the course number and see the course name and when it's typically offered. So I scraped the course information and put together a little bit of Javascript to add tooltips to the requirements.

![screenshot](https://github.com/drifkin/stanford-cs-reqs/raw/master/screenshot.png)

## Usage

I have a hosted version up at [http://www.drifkin.net/stanford-cs-reqs/](http://www.drifkin.net/stanford-cs-reqs/)

There are a few controls on the right side to indicate which course numbers have tooltips. You can also highlight courses that are typically offered within a particular quarter.

## Build

You can also build it yourself: 

* Clone this repository and enter the directory.
* Run `npm install` to install dependencies
* Run `npm run build` to fetch course information and build a static site
* Now open `dist/index.html`

## Limitations

The best source of the specialization requirements I could find was in the middle of a PDF document. I extracted out a couple of pages and ran it through some PDF to HTML converter, which produced, um, not the best output. Looks a little funky, but it works.

Also, the client's parsing is very dumb, it just looks for numbers (with an optional leading `"CS"`) and tries to match the number with the known course information. This produces incorrect results (Psych 110 gets confused for CS 110) and also more amusing errors (apparently the "27" in "27 units" has something to do with literature and social online learning). I'll try to make the parser nicer in the future.
