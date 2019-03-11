var utils = require("./utils");
var fs = require("fs");

class WeekHighs {
  constructor(theFile, about) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
    this.aboutObj = about;
  }
  getHeaders() {
    var re = /<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Game<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Game<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Series<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Series<\/div>/;
    if (!this.theFile.match(re)) {
      fs.appendFileSync(
        utils.logFile,
        "Failed to find weeklyHighs .... terminating"
      );
      return;
    }
    var tmp = this.theFile.match(re)[0];

    var lines = tmp.split("\n");
    var self = this;
    this.countHDCP = 0;
    this.count1030 = 0;
    lines.forEach(function(line, index, arr) {
      var val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      // step back a line to get the underscore
      var pos = utils.getColumnPos(arr[index - 1]);
      var width = utils.getColumnWidth(arr[index - 1]);
      switch (val) {
        case "Scratch&nbsp;Game":
          self.headers.push({
            name: "Game",
            pos: pos,
            width: width
          });
          break;
        case "Scratch&nbsp;Series":
          self.headers.push({
            name: "Series",
            pos: pos,
            width: width
          });
          break;
        default:
      }
    });
  }
  getWeekHighs() {
    this.getHeaders();
    // if we don't find any bail
    if (this.headers.length === 0) return this.theData;

    var re = /(?:<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Game<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Game<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Series<\/div>[\r]?\n<div.*><\/div>[\r]?\n<div.*>Scratch&nbsp;Series<\/div>[\r]?\n)([\s\S]*?)(?=[\r]?\n<div.*?">BLS-201)/;
    var tmp = this.theFile.match(re)[1];

    //TODO put gender in Db
    var gender = "Mens";
    if (this.aboutObj.name === "LADYTRIO" || this.aboutObj.name ==='WHOCARES') gender = "Womens";

    var lines = tmp.split("\n");
    // remove the header ('Men/Women' if it exists .. single sex don't have it
    var lineData = lines[0].match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2];
    var startIndex = 0;
    if (!parseInt(lineData)) startIndex++;
    // add the scores from each line pair
    for (var i = startIndex; i < lines.length; i += 2) {
      // check if we have reached 'Women' header
      if (
        lines[i].match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2] === "Women"
      ) {
        gender = "Womens";
        i++;
      }
      // check if we have reached 'Girls' header
      if (
        lines[i].match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2] === "Girls"
      ) {
        gender = "Womens";
        i++;
      }

      var pos = utils.getColumnPos(lines[i]);
      var width = utils.getColumnWidth(lines[i]);
      var name = lines[i + 1]
        .match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2]
        .replace(/&nbsp;/g, " ");
      var score = parseInt(
        lines[i].match(/(#0000.{2}">|#5B5B5B">)(\d+)(<\/div>)/)[2]
      );
      var header = this.findHeader(pos);

      this.theData.push({
        name: name,
        score: score,
        week: this.aboutObj.week,
        leagueName: this.aboutObj.displayName,
        type: gender + header.name,
        date: utils.dateFromString(this.aboutObj.date)
      });
    }
    return this.theData;
  }
  findHeader(pos) {
    for (let i = 0; i < this.headers.length; i++) {
      if (
        this.headers[i].pos <= pos &&
        pos <= this.headers[i].pos + this.headers[i].width
      )
        return this.headers[i];
    }
    return {};
  }
}

module.exports = WeekHighs;
