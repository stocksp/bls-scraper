const utils = require("./utils");

class Standings {
  constructor(theFile, league) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
    this.league = league;
  }
  getHeaders() {
    const re = /<div.*><\/div>[\r]?\n<div.*>Place<\/div>[\s\S]*?<div.*>-3-<\/div>/;
    let tmp = this.theFile.match(re)[0];

    const lines = tmp.split("\n");

    let countHDCP = 0;
    let count1030 = 0;
    lines.forEach((line, index, arr) => {
      const val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      // step back a line to get the underscore
      const pos = utils.getColumnPos(arr[index - 1]);
      const width = utils.getColumnWidth(arr[index - 1]);
      switch (val) {
        //Place
        case "Place":
          this.headers.push({ name: "Place", pos: pos, width: width });
          //theStanding.place = parseInt(line.match(/(#000000">)(\d+)/)[2]);
          break;
        // Lane
        case "Lane":
          this.headers.push({ name: "Lane", pos: pos, width: width });
          break;
        // number
        case "#":
          this.headers.push({ name: "TeamNum", pos: pos, width: width });
          break;
        // name
        case "Team&nbsp;Name":
          this.headers.push({ name: "Name", pos: pos, width: width });
          break;
        // Won
        case "Won":
          this.headers.push({ name: "PointsWon", pos: pos, width: width });
          break;
        // Lost
        case "Lost":
          this.headers.push({ name: "PointsLost", pos: pos, width: width });
          break;
        // YTD won 'WON'
        case "WON":
          this.headers.push({ name: "YearToDateWon", pos: pos, width: width });
          break;
        // YTD lost 'LOST'
        case "LOST":
          this.headers.push({ name: "YearToDateLost", pos: pos, width: width });
          break;
        case "Ave":
          this.headers.push({ name: "TeamAve", pos: pos, width: width });
          break;
        case "HDCP":
          // two 'HDCP's come through we want the second which is total
          if (countHDCP++ === 1)
            this.headers.push({ name: "Total", pos: pos, width: width });
          break;
        case "Pins":
          this.headers.push({ name: "TotalScratch", pos: pos, width: width });
          break;
        case "10&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;30":
          // two of these we want the  first which is scratch
          if (count1030++ === 0)
            this.headers.push({ name: "HighGame", pos: pos, width: width / 2 });
          this.headers.push({
            name: "HighSeries",
            pos: pos + width / 2,
            width: width / 2
          });
          break;
        case "-1-":
          this.headers.push({ name: "Game1", pos: pos, width: width });
          break;
        case "-2-":
          this.headers.push({ name: "Game2", pos: pos, width: width });
          break;
        case "-3-":
          this.headers.push({ name: "Game3", pos: pos, width: width });
          break;
        case "-4-":
          this.headers.push({ name: "Game4", pos: pos, width: width });
          break;
        default:
      }
    });
  }
  getStandings() {
    this.getHeaders();
    var re;
    if (this.league === "TuesdayDoubles")
      re = /(?:-4-<\/div>[\r]?\n)([\s\S]*?)(?=[\r]?\n<div.*?Review&nbsp;of&nbsp;Last&nbsp;Week's)/;
    else
      re = /(?:-3-<\/div>[\r]?\n)([\s\S]*?)(?=[\r]?\n<div.*?Review&nbsp;of&nbsp;Last&nbsp;Week's)/;
    var tmp = this.theFile.match(re)[1];
    // remove the ** Teams appear out of order
    tmp = tmp.replace(/<div.*?>\*\*.*?Team.*?\/div>/g, "");
    //remove *** Although not shown
    tmp = tmp.replace(/<div.*?>\*\*\*.*?\/div>/g, "");
    var lines = tmp.split("\n");
    // we may have an empty line or two so lines could have a length of 1 or 2
    while (lines.length > 2) {
      var teamLines = this.getStandingLines(lines);

      var theObj = this.makeStandingObject(teamLines);
      this.theData.push(theObj);
      // remove the team
      lines.splice(0, teamLines.length);
    }
    return this.theData;
  }
  makeStandingObject(theLines) {
    const theStanding = {};
    let pos = -1;
    let headerObj;

    theLines.forEach((line, index, arr) => {
      //console.log(line);
      const lineVal = line.match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2];
      pos = utils.getColumnPos(line);
      // see if we have the 1/2 point value it belongs to the previous standing value which should
      // be only 11 px away
      if (lineVal === "½") {
        const prePos = utils.getColumnPos(arr[index - 1]);
        if (pos - prePos < 15) {
          headerObj = this.findHeader(prePos);
          theStanding[headerObj.name] = theStanding[headerObj.name] + 0.5;
        }
        return;
      }
      headerObj = this.findHeader(pos);
      if (headerObj.name === undefined) return;
      const name = headerObj.name;
      const prop =
        headerObj.name == "Name"
          ? lineVal.replace(/&nbsp;/g, " ")
          : parseInt(lineVal);
      theStanding[headerObj.name] = prop;
    });
    return theStanding;
  }
  // gets the next team and bowlers
  // left: 25 is the start of each team
  getStandingLines(lines) {
    var theLines = [];
    theLines.push(lines[0]);
    var i = 1;
    while (i < lines.length && utils.getColumnPos(lines[i]) > 35) {
      theLines.push(lines[i]);
      i++;
    }

    return theLines;
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

module.exports = Standings;
