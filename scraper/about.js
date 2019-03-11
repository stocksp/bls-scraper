let utils = require("./utils");

class About {
  constructor(theFile) {
    this.theFile = theFile;
  }
  getAbout() {
    let data = this.theFile.match(/(?:<body>)[\s\S]*?(?=<div.*?BLS-20)/)[0];

    let date = data.match(/\d{1,2}\/\d{1,2}\/\d{4}/)[0];
    let week = parseInt(
      data.match(/(&nbsp;&nbsp;&nbsp;Week&nbsp;)(\d{1,2})/)[2]
    );
    let weekOf = parseInt(
      data.match(
        /(&nbsp;&nbsp;&nbsp;Week&nbsp;\d{1,2}&nbsp;of&nbsp;)(\d{1,2})/
      )[2]
    );
    let day = data.match(
      /#000000">(.*?)&nbsp;&nbsp;&nbsp;(\d{1,2}:\d{2})&nbsp;([a|p]m)/i
    )[1];
    let time = data.match(
      /#000000">(.*?)&nbsp;&nbsp;&nbsp;(\d{1,2}:\d{2})&nbsp;([a|p]m)/i
    )[2];
    let ampm = data.match(
      /#000000">(.*?)&nbsp;&nbsp;&nbsp;(\d{1,2}:\d{2})&nbsp;([a|p]m)/i
    )[3];
    let pData = data.match(/">President:&nbsp;(.*?)<\/div/);
    let president = pData ? pData[1].replace(/&nbsp;/g, " ") : "";
    pData = data.match(/">Secretary\/Treasurer:&nbsp;(.*?)<\/div/);
    let secretray = pData ? pData[1].replace(/&nbsp;/g, " ") : "";
    // the info messages
    let infoArr = [];
    let iData = data.match(
      /<div style="position: absolute; top: 107px[\s\S]*?(?=[\r]?\n<div.*?font: 0pt;)/
    );
    if (iData) {
      iData = data.match(
        /<div style="position: absolute; top: 107px[\s\S]*?(?=[\r]?\n<div.*?font: 0pt;)/
      )[0];

      if (iData.match(/You&nbsp;may&nbsp;edit,&nbsp;add&nbsp;or/) == null) {
        let lines = iData.split("\n");
        let i = 0;
        while (i < lines.length) {
          infoArr.push(
            lines[i++]
              .match(/(#.{6}">)(.*)(<\/div>)/)[2]
              .replace(/&nbsp;/g, " ")
          );
        }
      }
    }

    return {
      //name: name,
      //displayName: displayName,
      date: date,
      week: week,
      weekOf: weekOf,
      day: day,
      time: time,
      ampm: ampm,
      season: utils.getSeasonString(date, week),
      president: president,
      secretary: secretray,
      winners: infoArr
    };
  }
}

module.exports = About;
