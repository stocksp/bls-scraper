const utils = require("./utils");
const fs = require("fs");

class Alpha {
  constructor(theFile, league) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
  }
  doHeaders() {
    const headerData = this.theFile.match(
      /(Alphabetical[\s\S]*?)(<div.*ID&nbsp;#<\/div>[\s\S]*?<div.*Total<\/div>)/
    )[2];

    const lines = headerData.split("\n");
    // we have duplicate header names so lets keep track
    let countSers = 0;
    let countGame = 0;
    let countTotal = 0;
    lines.forEach((line, index, arr) => {
      let pos = utils.getColumnPos(line);
      let width = utils.getColumnWidth(line);
      const val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      switch (val) {
        // both id and #
        case "ID&nbsp;#":
          // get the line before the line with the data
          // this is the underscore which I believe is more acurate
          //TODO replace all the 'fudge factors' below AND thorough out with this
          const regx = new RegExp(
            `<div.*?div>[\r]?\n(?=${line.replace("/", "/")})`
          );
          const result = regx.exec(this.theFile);
          //console.log(result[0])
          //const lineBefore = utils.lineBefore(this.theFile, line)
          this.headers.push({
            name: "id",
            pos: utils.getColumnPos(result[0]),
            width: utils.getColumnWidth(result[0])
          });
          break;
        case "Sex":
          this.headers.push({
            name: "sex",
            pos: pos,
            width: width
          });
          break;
        // Name
        case "Name":
          this.headers.push({
            name: "name",
            pos: pos,
            width: width
          });
          break;

        // game 1
        // move all gaves left 10
        case "-1-":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "game1",
            pos: pos - 10,
            width: width
          });
          break;
        // game 2
        case "-2-":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "game2",
            pos: pos - 10,
            width: width
          });
          break;
        // game 3
        case "-3-":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "game3",
            pos: pos - 10,
            width: width
          });
          break;

        default:
      }
    });
  }
  getAlphaList() {
    this.doHeaders();
    let tmp = this.theFile.match(
      /(Alphabetical[\s\S]*?)(<div.*Name<\/div>[\s\S]*?<div.*Total<\/div>[\s\S]*?<div.*Ave<\/div>)[\r]?\n([\s\S]*)/
    );

    let noPbreak = tmp[3].replace(
      /<div.*?BLS-20[\s\S]*?Ave<\/div>[\s\S]*?Ave<\/div>[\r]?\n/g,
      ""
    );
    noPbreak = noPbreak.replace(/[\r]?\n<div.*?BLS-20[\s\S]*/, "");
    // Survivor has two divisions in the alpha section
    // remove division 1 section label
    noPbreak = noPbreak.replace(
      /<div.*?>z&nbsp;<\/div>[\r]?\n<div.*?&nbsp;&nbsp;&nbsp;Division&nbsp;1:&nbsp;200&nbsp;+<\/div>/,
      ""
    );

    // capture 2nd division and header and first line after which contains blsid of first and start of 2nd section
    tmp = noPbreak.match(
      /(<div.*?>z&nbsp;[\s\S]*?Division&nbsp;2[\s\S]*?<div.*Ave<\/div>[\s\S]*?<div.*Ave<\/div>)\s*?<div.*>(\d+)<\/div>/
    );
    let startOfSecond = "";
    if (tmp && tmp[2]) {
      startOfSecond = tmp[2];
      console.log("start of second", tmp[2]);
    }

    noPbreak = noPbreak.replace(
      /<div.*?>z&nbsp;[\s\S]*?Division&nbsp;2[\s\S]*?<div.*Ave<\/div>[\s\S]*?<div.*Ave<\/div>/,
      ""
    );
    noPbreak = noPbreak.replace(/\n\n/, "\n");

    const lines = noPbreak.split("\n");

    let start = true;
    let secondDivision = false;

    let bowler;
    lines.forEach((line, i, lines) => {
      //hack
      if (typeof line !== "string" || line[0] !== "<") return;
      //console.log("The line", i, line);
      const lineVal = line
        .match(/(#5B5B5B">|#000000">)(.*)(<\/div>)/)[2]
        .replace(/&nbsp;/g, " ");
      const pos = utils.getColumnPos(line);
      let headerObj = this.findHeader(pos);
      if (headerObj.name === undefined) return;
      if (headerObj.name == "id") {
        // add if they have a score
        if (start === false && bowler.game1) this.theData.push(bowler);
        bowler = Object.create({});
        bowler.id = parseInt(lineVal);
        start = false;
        // if we have divisions add it
        if (startOfSecond) {
          if (lineVal === startOfSecond) secondDivision = true;
          secondDivision ? (bowler.div = 2) : (bowler.div = 1);
        }
      } else {
        // if we have divisions add it
        if (headerObj.name == "id" && startOfSecond) {
          if (lineVal === startOfSecond) secondDivision = true;
          secondDivision ? (bowler.div = 2) : (bowler.div = 1);
        }
        this.addBowlerData(bowler, line);
      }
    });
    // add last bowler if they have scores
    if (bowler.game1) this.theData.push(bowler);
    return this.theData;
  }
  getBowlers(lines) {
    const theBowlers = [];
    let bowlerLines = [];
    const collection = [];

    let i = 0;
    // add the first one so we can get started
    bowlerLines.push(lines[i++]);

    // second line is where the name is so use it to find the id
    let idPos = utils.getColumnPos(lines[1]);
    // < left: 50px finds the id and start
    while (i < lines.length) {
      while (i < lines.length && utils.getColumnPos(lines[i]) >= idPos) {
        bowlerLines.push(lines[i++]);
      }
      collection.push(bowlerLines);
      if (i < lines.length) {
        bowlerLines = [];
        bowlerLines.push(lines[i++]);
      }
    }
    collection.forEach(bowlerLines => {
      let bowler = {};
      bowlerLines.forEach(function(data) {
        this.addBowlerData(bowler, data);
      });
      // only add the bowler if they have bowled
      if (bowler.games !== undefined && bowler.games > 0)
        theBowlers.push(bowler);
    });

    return theBowlers;
  }
  addBowlerData(bowler, line) {
    const lineVal = line
      .match(/(#5B5B5B">|#000000">)(.*)(<\/div>)/)[2]
      .replace(/&nbsp;/g, " ");
    const pos = utils.getColumnPos(line);
    let headerObj = this.findHeader(pos);
    if (headerObj.name === undefined) return;
    // lets return ints for these members .. rest are strings
    let numArr = ["game1", "game2", "game3"];
    if (
      numArr.some(function(val) {
        return headerObj.name === val;
      })
    ) {
      if (isNaN(parseInt(lineVal))) bowler[headerObj.name] = lineVal;
      else bowler[headerObj.name] = parseInt(lineVal);
    } else {
      bowler[headerObj.name] = lineVal;
    }
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

module.exports = Alpha;
