var utils = require("./utils");

const nameMap = {
  teamScratchGame: "Team Scratch Game",
  teamHandicapGame: "Team Handicap Game",
  teamScratchSeries: "Team Scratch Series",
  teamHandicapSeries: "Team Handicap Series",
  scratchGame: "Scratch Game",
  scratchSeries: "Scratch Series",
  handicapGame: "Handicap Game",
  handicapSeries: "Handicap Series"
};
class Highs {
  constructor(theFile, leagueName) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
    this.leagueName = leagueName;
  }
  getHeaders() {
    // clear it out we make a new one for each section
    this.headers.length = 0;
    var re = /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/;
    var tmp = this.highData.match(re)[0];

    var lines = tmp.split("\n");
    // remove extra \n
    lines.pop();
    var self = this;

    lines.forEach(function(line, index, arr) {
      var pos = utils.getColumnPos(line);
      var width = utils.getColumnWidth(line);
      var val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      switch (val) {
        // for team
        case "Team&nbsp;Scratch&nbsp;Game":
          // step back a line to get the underscore
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "teamScratchGame",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Scratch&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "teamScratchSeries",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Handicap&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "teamHandicapGame",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Handicap&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "teamHandicapSeries",
            pos: pos,
            width: width
          });
          break;
        // for bowlers
        case "Scratch&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "scratchGame",
            pos: pos,
            width: width
          });
          break;
        case "Scratch&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "scratchSeries",
            pos: pos,
            width: width
          });
          break;
        case "Handicap&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "handicapGame",
            pos: pos,
            width: width
          });
          break;
        case "Handicap&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          self.headers.push({
            name: "handicapSeries",
            pos: pos,
            width: width
          });
          break;

        default:
      }
    });
  }
  getHighs() {
    // first start with last weeks top scores
    this.highData = this.theFile.match(
      /(<div.*Last&nbsp;Week's&nbsp;Top&nbsp;Scores<\/div>[\r]?\n)+([\s\S]*?)(?=[\r]?\n<div.*?">BLS-201)/
    )[2];
    // get team headers
    this.getHeaders();
    // remove the header
    this.highData = this.highData.replace(
      /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/,
      ""
    );

    this.makeHighObject({
      name: "weeklyTeam"
    });
    // label comes either before (1st line) or after header so...
    // if the first line is not empty get if not set a flag to get it after we get the headers
    // !! we may have no label ....see Who cares league
    var labelIsAfter = false;
    var noLabel = false;
    var label = "";
    var tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
    if (tmp) {
      label = tmp[1].replace(/&nbsp;/g, " ");
      //remove first line
      this.highData = this.highData.replace(/^<div.*?">(.+)<\/div>[\r]?\n/, "");
    } else {
      labelIsAfter = true;
    }
    this.getHeaders();
    // remove the header
    this.highData = this.highData.replace(
      /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/,
      ""
    );
    if (labelIsAfter) {
      // this should match now
      tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
      // if we have a number then we don't have a label
      if (Number(tmp[1]) > 0) {
        noLabel = true;
        label = "A";
      } else {
        label = tmp[1].replace(/&nbsp;/g, " ");
        this.highData = this.highData.replace(
          /^<div.*?">(.+)<\/div>[\r]?\n/,
          ""
        );
      }
    }
    // make new object
    this.makeHighObject({
      name: "weeklyBowler",
      label: label
    });
    // if we don't have a lable then we don't have another section!
    if (!noLabel) {
      // label comes either before (1st line) or after header so...
      // if the first line is not empty get if not set a flag to get it after we get the headers
      labelIsAfter = false;
      tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
      if (tmp) {
        label = tmp[1].replace(/&nbsp;/g, " ");
        if (this.leagueName === "SURVIVOR") label = "Division 2";
        //remove first line
        this.highData = this.highData.replace(
          /^<div.*?">(.+)<\/div>[\r]?\n/,
          ""
        );
      } else {
        labelIsAfter = true;
      }
      // now the second section
      // make new object
      this.makeHighObject({
        name: "weeklyBowler",
        label: label
      });
    }
    // TODO over Average

    // season highs
    // first start with last weeks top scores
    this.highData = this.theFile.match(
      /(<div.*Season&nbsp;High&nbsp;Scores<\/div>[\r]?\n)+([\s\S]*?)(?=[\r]?\n<div.*?">BLS-201)/
    )[2];
    // get team headers
    this.getHeaders();
    // remove the header
    this.highData = this.highData.replace(
      /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/,
      ""
    );
    // remove 'Bowlers must have' if found
    this.highData = this.highData.replace(
      /<div.*>Bowlers&nbsp;must&nbsp;have.*<\/div>[\r]?\n/,
      ""
    );

    this.makeHighObject({
      name: "seasonTeamHigh"
    });
    // label comes either before (1st line) or after header so...
    // if the first line is not empty get if not set a flag to get it after we get the headers
    labelIsAfter = false;
    noLabel = false;

    tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
    if (tmp) {
      label = tmp[1].replace(/&nbsp;/g, " ");
      //remove first line
      this.highData = this.highData.replace(/^<div.*?">(.+)<\/div>[\r]?\n/, "");
    } else {
      labelIsAfter = true;
    }
    this.getHeaders();
    // remove the header
    this.highData = this.highData.replace(
      /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/,
      ""
    );
    if (labelIsAfter) {
      // this should match now
      tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
      // if we have a number then we don't have a label
      if (Number(tmp[1]) > 0) {
        noLabel = true;
        label = "A";
      } else {
        label = tmp[1].replace(/&nbsp;/g, " ");
        this.highData = this.highData.replace(
          /^<div.*?">(.+)<\/div>[\r]?\n/,
          ""
        );
      }
    }
    // make new object
    this.makeHighObject({
      name: "seasonBowler",
      label: label
    });

    // if we don't have a lable then we don't have another section!
    if (!noLabel) {
      // label comes either before (1st line) or after header so...
      // if the first line is not empty get if not set a flag to get it after we get the headers
      var labelIsAfter = false;
      var tmp = this.highData.match(/^<div.*?">(.+)<\/div>/);
      if (tmp) {
        var label = tmp[1].replace(/&nbsp;/g, " ");
        if (this.leagueName === "SURVIVOR") label = "Division 2";
        //remove first line
        this.highData = this.highData.replace(
          /^<div.*?">(.+)<\/div>[\r]?\n/,
          ""
        );
      } else {
        var labelIsAfter = true;
      }
      // now the second section
      // make new object
      this.makeHighObject({
        name: "seasonBowler",
        label: label
      });
    }
    // convert the array into object that Angular already knows how to display
    this.oldData = this.theData;
    this.convertToObject();
    return this.theData;
  }
  // change the array to a single object with mapping Angular uses
  convertToObject() {
    var newObj = {};
    var label = "Men";
    this.theData.forEach(function(obj) {
      switch (obj.name) {
        case "weeklyTeam":
          newObj["weeklyTeamHigh"] = {};
          Object.getOwnPropertyNames(obj).forEach(function(i, index, arr) {
            if (i != "name" && i !== "label") {
              newObj.weeklyTeamHigh[i] = obj[i];
              newObj.weeklyTeamHigh[i].name = nameMap[i];
            }
          });
          break;
        case "weeklyBowler":
          var name = "weeklyDivA";
          if (
            obj.label === "Bk Avg 0-199" ||
            obj.label === "Women" ||
            obj.label === "b" ||
            obj.label === "Girls" ||
            obj.label === "Division 2"
          )
            name = "weeklyDivB";
          newObj[name] = {};
          Object.getOwnPropertyNames(obj).forEach(function(i, index, arr) {
            if (i != "name" && i !== "label") {
              newObj[name][i] = obj[i];
              newObj[name][i].name = nameMap[i] + " " + obj.label;
            }
          });
          break;
        case "seasonBowler":
          var name = "seasonDivA";
          if (
            obj.label === "Bk Avg 0-189" ||
            obj.label === "Women" ||
            obj.label === "b" ||
            obj.label === "Girls" ||
            obj.label === "Division 2"
          )
            name = "seasonDivB";
          newObj[name] = {};
          Object.getOwnPropertyNames(obj).forEach(function(i, index, arr) {
            if (i != "name" && i !== "label") {
              newObj[name][i] = obj[i];
              if (i != "name" && i !== "label") {
                newObj[name][i] = obj[i];
                newObj[name][i].name = nameMap[i] + " " + obj.label;
              }
            }
          });
          break;
        case "seasonTeamHigh":
          newObj["seasonTeamHigh"] = {};
          Object.getOwnPropertyNames(obj).forEach(function(i, index, arr) {
            if (i != "name" && i !== "label") {
              newObj.seasonTeamHigh[i] = obj[i];
              newObj.seasonTeamHigh[i].name = nameMap[i];
            }
          });
          break;
        default:
      }
    });

    this.theData = newObj;
  }
  makeHighObject(theObj) {
    var obj = theObj;
    var self = this;
    // add each of the column objects in the header where we put the scores
    this.headers.forEach(function(o) {
      obj[o.name] = {
        scores: []
      };
    });
    //var lines = this.highData.match(/<div[\s\S]*?(?=[\r]?\n<div.*><)/)[0].split('\n');
    var lines = this.highData.match(
      /(<div.*>\d+<\/div>[\r]?\n<div.*[\r]?\n){1,}/
    ); //[0]
    if (lines) {
      lines = this.highData
        .match(/(<div.*>\d+<\/div>[\r]?\n<div.*[\r]?\n){1,}/)[0]
        .split("\n");
      // remove extra \n
      lines.pop();
    } else {
      lines = this.highData.split("\n");
    }

    // add the scores from each line pair
    for (var i = 0; i < lines.length; i += 2) {
      var pos = utils.getColumnPos(lines[i]);
      var width = utils.getColumnWidth(lines[i]);
      var name = lines[i + 1]
        .match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2]
        .replace(/&nbsp;/g, " ");
      var score = parseInt(
        lines[i].match(/(#0000.{2}">|#5B5B5B">)(\d+)(<\/div>)/)[2]
      );
      var header = this.findHeader(pos);
      theObj[header.name].scores.push({
        score: score,
        name: name
      });
    }
    this.theData.push(theObj);
    // now the last week bowler highs
    // remove team data
    this.highData = this.highData.replace(
      /(<div.*>\d+<\/div>[\r]?\n<div.*[\r]?\n){1,}/,
      ""
    );
  }
  findHeader(pos) {
    for (var i = 0; i < this.headers.length; i++) {
      if (
        this.headers[i].pos <= pos &&
        pos <= this.headers[i].pos + this.headers[i].width
      )
        return this.headers[i];
    }
    return {};
  }
}

module.exports = Highs;
