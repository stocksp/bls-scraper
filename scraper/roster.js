const utils = require("./utils");

class Roster {
  constructor(theFile, league) {
    this.theFile = theFile;
    this.theData = [];
    this.headers = [];
  }
  doHeaders() {
    const headerData = this.theFile.match(
      /<div.*ID&nbsp;#[\s\S]*?<div.*Series&nbsp;Ave&nbsp;\+\/-<\/div>/
    )[0];

    const lines = headerData.split("\n");

    // we have duplicate header names so lets keep track
    let countSers = 0;
    let countGame = 0;
    let countTotal = 0;
    lines.forEach((line, index, arr) => {
      
      const val = line.match(/(#00.{4}">)(.*)(<\/div>)/)[2];
      if (val === "") return;
      let pos = utils.getColumnPos(line);
      let width = utils.getColumnWidth(line);
      switch (val) {
        // both id and #
        case "ID&nbsp;#":
        // get the line before the line with the data
        // this is the underscore which I believe is more acurate
        //TODO replace all the 'fudge factors' below AND thorough out with this
          const regx = new RegExp(`<div.*?div>[\r]?\n(?=${line.replace('/', '\/')})`)
          const result = regx.exec(this.theFile)
          //console.log(result[0])
          //const lineBefore = utils.lineBefore(this.theFile, line)
          this.headers.push({
            name: "id",
            pos: utils.getColumnPos(result[0]),
            width: utils.getColumnWidth(result[0])
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
        case "Ave&nbsp;HDCP":
          this.headers.push({
            name: "average",
            pos: pos - 10,
            width: width / 2
          });
          this.headers.push({
            name: "hdcp",
            pos: pos + width / 2,
            width: width / 2
          });
          break;
        // scratch leagues don't have HDCP
        case "Ave":
          // step back a line to get the underscore
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "average",
            pos: pos,
            width: width
          });
          break;
        case "Pins&nbsp;&nbsp;Gms":
          // step back a line to get the underscore
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "pins",
            pos: pos,
            width: width / 2
          });
          // the games over flow  so we are pushing games to the right along with each game
          this.headers.push({
            name: "games",
            pos: pos + width / 2,
            width: width / 2 - 5
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
        // game 4
        case "-4-":
          pos = utils.getColumnPos(arr[index - 1]);
          width = utils.getColumnWidth(arr[index - 1]);
          this.headers.push({
            name: "game4",
            pos: pos - 10,
            width: width
          });
          break;
        // Total
        case "Total":
          if (countTotal++ === 0)
            this.headers.push({
              name: "series",
              pos: pos,
              width: width
            });
          break;
        // Game
        case "Game":
          if (countGame++ === 0)
            this.headers.push({
              name: "hiGame",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "hiGameHdcp",
              pos: pos,
              width: width
            });
          break;
        // Series
        case "Sers":
          if (countSers++ === 0)
            this.headers.push({
              name: "hiSeries",
              pos: pos,
              width: width
            });
          else
            this.headers.push({
              name: "hiSeriesHdcp",
              pos: pos,
              width: width
            });
          break;
        // Series
        case "Series&nbsp;Ave&nbsp;+/-":
          // fudge as data is shifted left
          this.headers.push({
            name: "overAve",
            pos: pos - 10,
            width: width
          });
          break;

        default:
      }
    });
  }
  getTeams() {
    this.doHeaders();
    const re = /(?:Series&nbsp;Ave&nbsp;\+\/-<\/div>[\r]?\n)([\s\S]*?(National&nbsp;Association&nbsp;Awards|Alphabetical&nbsp;List&nbsp;of&nbsp;All&nbsp;Members))/;
    const tmp = this.theFile.match(re)[1];
    const noPbreak = tmp.replace(
      /<div.*?BLS-20[\s\S]*?Series&nbsp;Ave&nbsp;\+\/-<\/div>[\r]?\n/g,
      ""
    );
    const justTheRoster = noPbreak.match(
      /([\s\S]*?)(?=[\r]?\n<div.*?BLS-20)/
    )[1];

    let lines = justTheRoster.split("\n");
    while (lines.length > 0) {
      let teamLines = this.getTeamLines(lines);
      let theTeam = this.getTeamData(teamLines);
      // remove the teamData
      teamLines.splice(0, 2);
      // now the bowlers
      let bowlers = this.getBowlers(teamLines);
      theTeam.bowlers = bowlers;
      // remove the team
      lines.splice(0, teamLines.length + 2);
      // make sure the team has a member that has bowled
      let teamHasGames = bowlers.some(function(b) {
        return b.games > 0;
      });
      if (teamHasGames) {
        this.theData.push(theTeam);
      }
    }
    return this.theData;
  }
  getBowlers(lines) {
    const theBowlers = [];
    let bowlerLines = [];
    const collection = [];

    // no team data!!
    if (lines.length === 0) return theBowlers;

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
      const bowler = {};
      bowlerLines.forEach(data => {
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
    const headerObj = this.findHeader(pos);
    if (headerObj.name === undefined) return;
    // lets return ints for these members .. rest are strings
    const numArr = ["id", "pins", "games", "series", "hiGame", "hiSeries"];
    if (
      numArr.some(function(val) {
        return headerObj.name === val;
      })
    ) {
      bowler[headerObj.name] = parseInt(lineVal);
    } else {
      bowler[headerObj.name] = lineVal;
    }
  }
  // gets the next team and bowlers
  // left: 25 is the start of each team
  getTeamLines(lines) {
    const theLines = [];
    theLines.push(lines[0]);
    var i = 1;
    while (i < lines.length && utils.getColumnPos(lines[i]) != 25) {
      theLines.push(lines[i]);
      i++;
    }

    return theLines;
  }
  // first two lines have the team data
  getTeamData(lines) {
    const name = lines[0]
      .match(/(&nbsp;-&nbsp;)(.*)(?=<\/div>)/)[2]
      .replace(/&nbsp;/g, " ");
    const id = lines[0].match(/(#.{6}">)(\d+)(?=&nbsp;-&nbsp)/)[2];
    const lane = lines[1].match(/(>&nbsp;Lane&nbsp;)(\d+)/)[2];
    const tmp = lines[1].match(/(HDCP=)(\d+)/);
    let handi = "";
    if (tmp) handi = tmp[2];
    else handi = "";
    const ave = lines[1].match(/(Ave=)(\d+)/)[2];
    return {
      teamName: name.replace("/", " "),
      teamId: parseInt(id),
      lane: parseInt(lane),
      average: ave,
      handi: handi
    };
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

module.exports = Roster;
