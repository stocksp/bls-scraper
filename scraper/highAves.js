const utils = require("./utils");

class HighAves {
  constructor(theFile, league) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
  }
  getHeaders() {
    // clear it out we make a new one for each section
    this.headers.length = 0;
    const re = /(<div.*><\/div>[\r]?\n<div.*?>.+<\/div>[\r]?\n)+/;
    const tmp = this.highData.match(re)[0];

    let lines = tmp.split("\n");
    // remove extra \n
    lines.pop();

    lines.forEach((line, index, arr) => {
      let pos = utils.getColumnPos(line);
      let width = utils.getColumnWidth(line);
      const val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      switch (val) {
        // for team
        case "Team&nbsp;Scratch&nbsp;Game":
          // step back a line to get the underscore
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "teamScratchGame",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Scratch&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "teamScratchSeries",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Handicap&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "teamHandicapGame",
            pos: pos,
            width: width
          });
          break;
        case "Team&nbsp;Handicap&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "teamHandicapSeries",
            pos: pos,
            width: width
          });
          break;
        // for bowlers
        case "Scratch&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({ name: "scratchGame", pos: pos, width: width });
          break;
        case "Scratch&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({ name: "scratchSeries", pos: pos, width: width });
          break;
        case "Handicap&nbsp;Game":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({ name: "handicapGame", pos: pos, width: width });
          break;
        case "Handicap&nbsp;Series":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({ name: "handicapSeries", pos: pos, width: width });
          break;

        default:
      }
    });
  }
  getHighAves() {
    // first start with last weeks top scores
    this.highData = this.theFile.match(
      /(<div.*Individual&nbsp;High&nbsp;Averages<\/div>[\r]?\n)+([\s\S]*?)(?=[\r]?\n<div.*?">BLS-201)/
    )[2];
    // get the value of the first line
    let tmp = this.highData.match(/^<div.*">(.+)<\/div>/)[1];
    // check if we have data .. high averages don't start until week 4
    if (tmp.match(/Bowlers&nbsp;must&nbsp;have&nbsp;a&nbsp;minimum/)) {
      return (this.theData = {
        name: "Bowlers Must have 12 games to be listed",
        score: 0
      });
    }
    // if we have a number then no columns or label
    if (parseInt(tmp) > 1) {
      let lines = this.highData
        .match(/(<div.*>\d+\.?\d+<\/div>[\r]?\n<div.*[\r]?\n){1,}/)[0]
        .split("\n");
      lines.pop();
      let theObj = { name: "highAves", scores: [] };
      // add the scores from each line pair
      for (let i = 0; i < lines.length; i += 2) {
        let name = lines[i + 1]
          .match(/(#.{6}">)(.*)(<\/div>)/)[2]
          .replace(/&nbsp;/g, " ");
        let score = parseFloat(
          lines[i].match(/(#.{6}">)(\d+\.?\d+)(<\/div>)/)[2]
        );
        theObj.scores.push({ score: score, name: name });
      }
      this.theData.push(theObj);
    } else {
      // we need to find out if the data is column (like TOBL) or row (like LADYTRIO
      let lines = this.highData.split("\n");
      // if the 4th line is a number we have row data like LADYTRIO
      tmp = lines[3].match(/^<div.*">(.+)<\/div>/)[1];
      if (parseInt(tmp) > 1) {
        // do the two sections
        for (let counter = 0; counter < 2; counter++) {
          // remove the first line and collect all the scores for the first section
          let label = lines.shift().match(/^<div.*">(.+)<\/div>/)[1];
          let theObj = { name: "highAves", label: label, scores: [] };
          // now add the scores
          for (let i = 0; i < lines.length; i += 2) {
            let name = lines[i + 1]
              .match(/(#.{6}">)(.*)(<\/div>)/)[2]
              .replace(/&nbsp;/g, " ");
            let score = parseFloat(
              lines[i].match(/(#.{6}">)(\d+\.?\d+)(<\/div>)/)[2]
            );
            theObj.scores.push({ score: score, name: name });
            // check if we have a number
            if (
              i + 2 == lines.length ||
              lines[i + 2].match(/(.{6}">)(\d+\.?\d+)(<\/div>)/) === null
            ) {
              // remove the lines
              lines.splice(0, i + 2);
              break;
            }
          }
          this.theData.push(theObj);
        }
      } else {
        // get the 4th element and use the left for column grouping
        let right = utils.getColumnPos(lines[3]);
        let labelLeft = lines.splice(0, 1)[0].match(/^<div.*">(.+)<\/div>/)[1];
        let labelRight = lines.splice(2, 1)[0].match(/^<div.*">(.+)<\/div>/)[1];
        let objLeft = { name: "highAves", label: labelLeft, scores: [] };
        let objRight = { name: "highAves", label: labelRight, scores: [] };
        // now add the scores
        for (let i = 0; i < lines.length; i += 2) {
          let name = lines[i + 1]
            .match(/(#.{6}">)(.*)(<\/div>)/)[2]
            .replace(/&nbsp;/g, " ");
          let score = parseFloat(
            lines[i].match(/(#.{6}">)(\d+\.?\d+)(<\/div>)/)[2]
          );
          let pos = utils.getColumnPos(lines[i]);
          if (pos > right) objRight.scores.push({ score: score, name: name });
          else objLeft.scores.push({ score: score, name: name });
        }
        this.theData.push(objLeft);
        this.theData.push(objRight);
      }
    }
    // convert the array into object that Angular already knows how to display
    this.convertToObject();
    return this.theData;
  }
  convertToObject() {
    const newObj = {};
    let label = "Men";
    this.theData.forEach((obj, i) => {
      // if we don't have a label then it only has one list like Classic Sports
      if (obj.label === undefined) {
        newObj.highAverageA = {};
        newObj.highAverageB = {};
        newObj.highAverageA.name = "High Averages";
        newObj.highAverageA.scores = obj.scores;
        return;
      } else {
        if (i === 0) {
          newObj.highAverageA = {};
          newObj.highAverageA.name = obj.label;
          newObj.highAverageA.scores = obj.scores;
        } else {
          newObj.highAverageB = {};
          newObj.highAverageB.name = obj.label;
          newObj.highAverageB.scores = obj.scores;
        }
        return;
      }
    });

    this.theData = newObj;
  }
  makeHighObject(theObj) {
    const obj = theObj;

    // add each of the column objects in the header where we put the scores
    this.headers.forEach(o => {
      obj[o.name] = { scores: [] };
    });
    //var lines = this.highData.match(/<div[\s\S]*?(?=[\r]?\n<div.*><)/)[0].letsplit('\n');
    let lines = this.highData
      .match(/(<div.*>\d+<\/div>[\r]?\n<div.*[\r]?\n){1,}/)[0]
      .split("\n");
    // remove extra \n
    lines.pop();
    // add the scores from each line pair
    for (let i = 0; i < lines.length; i += 2) {
      let pos = utils.getColumnPos(lines[i]);
      let width = utils.getColumnWidth(lines[i]);
      let name = lines[i + 1]
        .match(/(#.{6}">)(.*)(<\/div>)/)[2]
        .replace(/&nbsp;/g, " ");
      let score = parseInt(lines[i].match(/(#.{6}">)(\d+)(<\/div>)/)[2]);
      let header = this.findHeader(pos);
      theObj[header.name].scores.push({ score: score, name: name });
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

module.exports = HighAves;
