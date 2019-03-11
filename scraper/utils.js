'use strict';
console.log('loading utils.js');
var fs = require('fs');
var path = require('path');

var moment = require('moment');

var logFile = path.resolve(__dirname, '../uploads/output') + '/output.txt';
var outputFolder = path.resolve(__dirname, '../uploads/output/') + '/';
var leagueFolder = path.resolve(__dirname, '../uploads/') + '/';
var imgFolder = path.resolve(__dirname, '../uploads/images/' + '/');
var watchFolder = path.resolve(__dirname, '../uploads/') + '/';

// return the data as a string
// w1314   winter 2013-2014 or s14 summer 2014
// we use the week to catch summer leagues that start in the same month winter ends
function getSeasonString(dateStr, week) {
    var reqVal = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    var date = new Date(parseInt(reqVal[3]), parseInt(reqVal[1]) - 1, parseInt(reqVal[2]));
    // month is 0 based so add 1
    var month = date.getMonth() + 1;
    var year = date.getYear();
    var start = 1,
        end = 1;
    if (month < 9) {
        start = (date.getFullYear() - 2000 - 1).toString();
        end = (date.getFullYear() - 2000).toString();
    } else {
        start = (date.getFullYear() - 2000).toString();
        end = (date.getFullYear() + 1 - 2000).toString();
    }
    // first which season is this  catches most cases
    var season = (month >= 9 || month <= 5) ? 'w' : 's';
    // catch summer leagues that start in April or May
    if ((month === 5 || month === 4) && week < 7)
        season = 's';
    // catch summer that end in September 
    if (month === 9 && week > 5)
        season = 's';
    if (season === 'w')
        return season + start + end;
    else
        return season + (date.getFullYear() - 2000).toString();
}
function dateFromString(dateStr) {
    var reqVal = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return new Date(parseInt(reqVal[3]), parseInt(reqVal[1]) - 1, parseInt(reqVal[2]));
}
function getSeason() {
    var month = moment().month() + 1;
    var year = moment().year();
    //console.log(month, year);
    if (month > 0 && month < 9) {
        return 'w' + (year - 2001) + (year - 2000);
    } else {
        return 'w' + (year - 2000) + (year - 2000 + 1);
    }
}

function getColumnPos(line) {
    var theLeft = line.match(/(left: *)(\d+)(?=px;)/)
    if (theLeft)
        return parseInt(theLeft[2]);
    else
        return -1;
}

function getColumnWidth(line) {
    var theWidth = line.match(/(width: *)(\d+)(?=px;)/)
    if (theWidth)
        return parseInt(theWidth[2]);
    else
        return -1;
}

function getValue(line) {
    return line.match(/(#00.0..">)(.*)(<\/div>)/)[2].replace(/&nbsp;/g, ' ');
}

// keep the  log file under 200K
function truncateLogFile() {
    fs.stat(logFile, function (err, stats) {
        if (stats) {
            var size = stats.size;
            if (size > 200000) {
                var buff = fs.readFileSync(logFile);
                var theFile = buff.toString();
                fs.writeFileSync(logFile, theFile.slice(size - 200000));
            }
        }
    });
}

function deleteOldOutputFiles() {
    try {
        var theFiles = fs.readdirSync(outputFolder);
        theFiles.forEach(function (file) {
            //console.log(file);
            fs.stat(outputFolder + file, function (err, stats) {
                if (err) {
                    console.log('Stat error: ' + err);
                }
                if (stats && !file.match(/log.txt/) && !file.match(/^\./) && !file.match(/\.zip/)) {
                    //console.log(file);
                    var theDate = stats.mtime;
                    var a = moment(theDate);
                    var now = moment();
                    var diff = now.diff(a, 'days');
                    //console.log('Age : ' + diff + ' days');
                    if (diff > 10) {
                        try {
                            fs.unlinkSync(outputFolder + file);
                        } catch (e) {
                            console.log('failed to delete file or folder in deleteOldOutputFiles', e)
                        }
                    }

                }
            });
        })
    } catch (e) {
        console.log('Exception in deleteOldOutputFiles: ' + e);
    }
}
function lineBefore(data, line){
    const lines = data.split("\n");
    const index = lines.findIndex(l => l === line)
    if(index > 0)
        return lines[index -1]
    return ''
}

exports.lineBefore = lineBefore
exports.getColumnPos = getColumnPos;
exports.getColumnWidth = getColumnWidth;
exports.getValue = getValue;
exports.logFile = logFile;
exports.leagueFolder = leagueFolder;
exports.outputFolder = outputFolder;
exports.imgFolder = imgFolder;
exports.truncateLogFile = truncateLogFile;
exports.deleteOldOutputFiles = deleteOldOutputFiles;
exports.getSeasonString = getSeasonString;
exports.dateFromString = dateFromString;
exports.getSeason = getSeason;
exports.watchFolder = watchFolder;
