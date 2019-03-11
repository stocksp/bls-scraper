const utils = require("./utils");

class Review {
  constructor(theFile) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
  }
  getHeaders() {
    this.reviewData = this.theFile.match(
      /(?:>Review&nbsp;of&nbsp;Last)(.*?<\/div>[\r]?\n)([\s\S]*?)(?=[\r]?\n<div.*?">BLS-201)/
    )[2];
    // pick up the line before 'Lanes' ... we need the underbar
    const re = /<div.*><\/div>[\r]?\n<div.*>Lanes<\/div>[\s\S]*?(>WON<){1}[\s\S]*?<div.*>WON<\/div>/;
    const tmp = this.reviewData.match(re)[0];

    const lines = tmp.split("\n");

    // we have duplicate header names so lets keep track
    let countName = 0;
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;
    let countTotal = 0;
    let countWon = 0;
    lines.forEach((line, index, arr) => {
      const val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      // step back a line to get the underscore
      const pos = utils.getColumnPos(arr[index - 1]);
      const width = utils.getColumnWidth(arr[index - 1]);

      switch (val) {
        //Lanes
        case "Lanes":
          this.headers.push({
            name: "lanes",
            pos: pos,
            width: width
          });
          //theStanding.place = parseInt(line.match(/(#000000">)(\d+)/)[2]);
          break;
        // Team&nbsp;Name
        case "Team&nbsp;Name":
          if (countName++ === 0)
            this.headers.push({
              name: "teamName1",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Name",
              pos: pos,
              width: width
            });
          break;
        // game 1
        case "-1-":
          if (count1++ === 0)
            this.headers.push({
              name: "team1Game1",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Game1",
              pos: pos,
              width: width
            });
          break;
        // game 2
        case "-2-":
          if (count2++ === 0)
            this.headers.push({
              name: "team1Game2",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Game2",
              pos: pos,
              width: width
            });
          break;
        // game 3
        case "-3-":
          if (count3++ === 0)
            this.headers.push({
              name: "team1Game3",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Game3",
              pos: pos,
              width: width
            });
          break;
        // game 4
        case "-4-":
          if (count3++ === 0)
            this.headers.push({
              name: "team1Game4",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Game4",
              pos: pos,
              width: width
            });
          break;
        // Total
        case "Total":
          if (countTotal++ === 0)
            this.headers.push({
              name: "team1Total",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Total",
              pos: pos,
              width: width
            });
          break;
        // WON
        case "WON":
          if (countWon++ === 0)
            this.headers.push({
              name: "team1Won",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "team2Won",
              pos: pos,
              width: width
            });
          break;

        default:
      }
    });
  }
  getReview() {
    this.getHeaders();
    const re = /(?:>WON<[\s\S]+?<div.*>WON<\/div>[\r]?\n)([\s\S]*)/;
    const tmp = this.reviewData.match(re)[1];

    let lines = tmp.split("\n");
    while (lines.length > 0) {
      const matchLines = this.getReviewLines(lines);

      let theObj = this.makeReviewObject(matchLines);
      this.theData.push(theObj);
      // remove the team
      lines.splice(0, matchLines.length);
    }
    return this.theData;
  }
  makeReviewObject(theLines) {
    let theReview = {},
      pos = -1,
      headerObj;

    theLines.forEach((line, index, arr) => {
      const lineVal = line
        .match(/(#0000.{2}">|#5B5B5B">)(.*)(<\/div>)/)[2]
        .replace(/&nbsp;/g, " ");
      pos = utils.getColumnPos(line);
      // see if we have the 1/2 point value it belongs to the previous review value which should
      // be only 11 px away
      if (lineVal === "½") {
        const prePos = utils.getColumnPos(arr[index - 1]);
        if (pos - prePos < 15) {
          headerObj = this.findHeader(prePos);
          theReview[headerObj.name] = theReview[headerObj.name] + ".5";
        }
        return;
      }
      headerObj = this.findHeader(pos);
      if (headerObj.name === undefined) return;

      theReview[headerObj.name] = lineVal;
    });
    return theReview;
  }
  getReviewLines(lines) {
    const theLines = [];
    const team1pos = this.headers[1].pos;
    theLines.push(lines[0]);
    let i = 1;
    while (i < lines.length && utils.getColumnPos(lines[i]) > team1pos - 1) {
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

module.exports = Review;
