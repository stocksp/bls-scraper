//console.log("start load scraper");
const fs = require("fs");

const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
const _ = require("lodash");
const iconvlite = require("iconv-lite");
const moment = require("moment");
const utils = require("./utils");

const About = require("./about");

const Roster = require("./roster.js");
const Alpha = require("./alpha.js");
const Standings = require("./standings.js");
const Review = require("./review.js");
const Highs = require("./highs.js");
const HighAves = require("./highAves.js");
const WeekHighs = require("./weekHighs.js");
const doSixOverAve = require("./doSixOverAve.js");
const path = require("path");
const MongoClient = require("mongodb").MongoClient;
const logFile = utils.logFile;

require('dotenv').config()
// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
//Your api key, from Mailgun’s Control Panel
const api_key = process.env.EMAIL_API_KEY;

//Your domain, from the Mailgun Control Panel
const domain = process.env.EMAIL_DOMAIN;
const auth = {
  auth: {
    api_key: api_key,
    domain: domain
  }
};
const meOnly = false;
const mail = true;
console.log("loading scraper");
const nodemailerMailgun = nodemailer.createTransport(mg(auth));
//console.log('db: ', db._connect_args[0]);
class Scraper {
  constructor(theFile) {
    this.theFile = theFile;
    global.theFile = theFile;
    this.sendMailWeeksMissing = this.sendMailWeeksMissing.bind(this);
  }

  async doFile() {
    console.log("starting file processing logfile: ", logFile);
    const rightNow = moment();
    fs.appendFileSync(
      logFile,
      "\r\n================================\r\nStarting Scrape for: " +
        this.theFile +
        "\r\n  at " +
        rightNow.format("dddd, MMMM Do YYYY, h:mm:ss a") +
        "\r\n"
    );

    try {
      // either Atlas or local
      //let mongoUri = "mongodb://localhost:27017";

       //Curtis
       let mongoUri = process.env.MONGO_URI;
      const dbConnect = await MongoClient.connect(
        mongoUri,
        { useNewUrlParser: true }
      );
      const db = dbConnect.db("dd3");
      console.log("Connected correctly to server");
      let col = db.collection("leagues");
      let fileName = path.basename(this.theFile, path.extname(this.theFile));

      global.fileName = fileName;

      let uploadPrefix = fileName.match(/^.*(?=-W)/)[0];

      let leagueObj = await col.findOne({ uploadPrefix });
      if (!leagueObj) {
        console.log(
          "File name not in uploadPrefix for any league",
          this.theFile,
          "prefix: ",
          uploadPrefix
        );
        fs.appendFileSync(
          logFile,
          "\r\n" +
            this.theFile +
            " File name not in uploadPrefix for any league"
        );
        return;
      }

      const buff = fs.readFileSync(this.theFile);
      // we need this for the 1/2 symbol
      const theData = iconvlite.decode(buff, "ISO-8859-1");

      console.log("starting about");
      const ver = "3.0";
      // check for no data
      if (mail && theData.match(/No&nbsp;scores&nbsp;have&nbsp/)) {
        nodemailerMailgun.sendMail(
          {
            from: "admin@cornerpins.com",
            to: [process.env.EMAIL_ME, process.env.EMAIL_LONNIE], // An array if you have multiple recipients.
            subject: "Double Decker Lanes No data sent",
            "h:Reply-To": process.env.EMAIL_ME,
            text: this.theFile + " league contains no scores!"
          },
          function(err, info) {
            if (err) {
              fs.appendFileSync(
                utils.logFile,
                "Email send  error occurred: " + " - " + err
              );
              console.log("Error in email send: " + err);
            } else {
              console.log("mail sent ok", info);
              fs.appendFileSync(utils.logFile, "Mail sent to paul: ");
            }
          }
        );
        return;
      }

      let theAbout = new About(theData);
      let aboutObj = theAbout.getAbout();
      aboutObj.version = ver;

      aboutObj.now = Date().replace(/ GMT.*/, "");

      aboutObj.name = leagueObj.league;
      aboutObj.displayName = leagueObj.displayName;
      let sheetDate = aboutObj.date;
      console.log("AboutObj", aboutObj);
      console.log("theDate string", sheetDate);
      console.log("theDate", utils.dateFromString(sheetDate));

      // start log

      let logData =
        "\r\n===============================================\r\n" +
        rightNow.format("dddd, MMMM Do YYYY, h:mm:ss a") +
        "\r\nStarting: " +
        aboutObj.name +
        " " +
        sheetDate +
        " week: " +
        aboutObj.week;
      fs.appendFileSync(logFile, logData);

      //var fileNameStub = aboutObj.name + sheetDate.replace(/\//g, '.') + '---Week-' + aboutObj.week + '-of-' + aboutObj.weekOf;

      //aboutObj.file = fileNameStub + '.about.json';
      aboutObj["type"] = "about";
      fs.appendFileSync(logFile, "\r\n... about processed");
      // fs.writeFileSync(utils.outputFolder + aboutObj.name + sheetDate.replace(/\//g, '.') + '---Week-' + aboutObj.week + '-of-' + aboutObj.weekOf + '.about.json', JSON.stringify(aboutObj), {
      //   flag: 'w'
      // });
      const emailList = await db
        .collection("email")
        .find({
          leagues: {
            $in: ["*", aboutObj.name]
          },
          enabled: true
        })
        .toArray();

      const theAlphaList = new Alpha(theData);
      let alphaData = theAlphaList.getAlphaList();
      alphaData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "alpha",
        //file: fileNameStub + '.alpha.json',
        now: Date().replace(/ GMT.*/, ""),
        data: alphaData
      };
      fs.appendFileSync(utils.logFile, "\r\n... alpha processed");

      const theHighs = new Highs(theData, aboutObj.name);
      let highsData = theHighs.getHighs();
      highsData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "high",
        //file: fileNameStub + '.high.json',
        now: Date().replace(/ GMT.*/, ""),
        data: highsData
      };
      fs.appendFileSync(utils.logFile, "\r\n... highs processed");

      const theWeekHighs = new WeekHighs(theData, aboutObj);
      let weekHighsData = theWeekHighs.getWeekHighs();
      if (weekHighsData.length === 0) {
        fs.appendFileSync(
          utils.logFile,
          this.theFile + " will NOT be processed"
        );
        console.log("Missing data in input file");
        return;
      }
      weekHighsData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "weekHighs",
        //file: fileNameStub + '.weekHighs.json',
        now: Date().replace(/ GMT.*/, ""),
        data: weekHighsData
      };
      fs.appendFileSync(utils.logFile, "\r\n... weekHighs processed");

      const theStandings = new Standings(theData, aboutObj.name);
      let standingData = theStandings.getStandings();
      standingData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "standing",
        //file: fileNameStub + '.standing.json',
        now: Date().replace(/ GMT.*/, ""),
        data: standingData
      };
      fs.appendFileSync(utils.logFile, "\r\n... standings processed");

      const theReview = new Review(theData);
      let reviewData = theReview.getReview();
      reviewData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "review",
        //file: fileNameStub + '.review.json',
        now: Date().replace(/ GMT.*/, ""),
        data: reviewData
      };
      fs.appendFileSync(utils.logFile, "\r\n... review processed");

      const theRoster = new Roster(theData);
      let rosterData = theRoster.getTeams();
      rosterData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "roster",
        //file: fileNameStub + '.roster.json',
        now: Date().replace(/ GMT.*/, ""),
        data: rosterData
      };
      fs.appendFileSync(utils.logFile, "\r\n... roster processed");

      const theHighAves = new HighAves(theData);
      let highAvesData = theHighAves.getHighAves();
      highAvesData = {
        name: aboutObj.name,
        date: utils.dateFromString(sheetDate),
        week: aboutObj.week,
        version: ver,
        season: aboutObj.season,
        type: "highAverages",
        //file: fileNameStub + '.highAverages.json',
        now: Date().replace(/ GMT.*/, ""),
        data: highAvesData
      };
      fs.appendFileSync(utils.logFile, "\r\n... highAverages processed");

      console.log("\nprocess bowler stats starting");
      //add gender to roster
      // make a list of bowlers and gender needed for absent bowlers to add their gender to the roster
      col = db.collection("bowlers");
      let bowlerGenderList = await col.find(
        {
          leagueName: aboutObj.name,
          season: aboutObj.season
        },
        {
          name: 1,
          sex: 1
        }
      );
      if (bowlerGenderList) bowlerGenderList = bowlerGenderList.toArray();
      else bowlerGenderList = [];

      const genderNameMap = addGenderToRoster();
      var scoreArr = [];
      var bowlersArr = [];
      rosterData.data.forEach(function(team) {
        team.bowlers.forEach(function(b) {
          if (b.game1 && parseInt(b.game1))
            scoreArr.push({
              name: b.name,
              game: parseInt(b.game1),
              number: 1,
              league: rosterData.name,
              date: rosterData.date,
              blsId: b.id,
              week: rosterData.week,
              season: aboutObj.season,
              sex: genderNameMap[b.name]
            });
          if (b.game2 && parseInt(b.game2))
            scoreArr.push({
              name: b.name,
              game: parseInt(b.game2),
              number: 2,
              league: rosterData.name,
              date: rosterData.date,
              blsId: b.id,
              week: rosterData.week,
              season: aboutObj.season,
              sex: genderNameMap[b.name]
            });
          if (b.game3 && parseInt(b.game3))
            scoreArr.push({
              name: b.name,
              game: parseInt(b.game3),
              number: 3,
              league: rosterData.name,
              date: rosterData.date,
              blsId: b.id,
              week: rosterData.week,
              season: aboutObj.season,
              sex: genderNameMap[b.name]
            });
          if (b.game4 && parseInt(b.game4))
            scoreArr.push({
              name: b.name,
              game: parseInt(b.game4),
              number: 4,
              league: rosterData.name,
              date: rosterData.date,
              blsId: b.id,
              week: rosterData.week,
              season: aboutObj.season,
              sex: genderNameMap[b.name]
            });

          // add the bowler if they bowled
          if (
            (b.game1 && parseInt(b.game1)) ||
            (b.game2 && parseInt(b.game2)) ||
            (b.game3 && parseInt(b.game3)) ||
            (b.average && parseInt(b.average))
          ) {
            bowlersArr.push({
              name: b.name,
              blsId: b.id,
              teamName: team.teamName,
              teamId: team.teamId,
              leagueName: rosterData.name,
              ave: parseInt(b.average.match(/\d+/)[0]),
              hiGame: b.hiGame,
              hiSeries: b.hiSeries,
              games: b.games,
              season: aboutObj.season,
              sex: genderNameMap[b.name]
            });
          }
        });
      });
      // add blsid to weekly highs
      weekHighsData.data.forEach(function(hs) {
        var bl = _.find(bowlersArr, function(b) {
          return hs.name === b.name.replace(/ \w\. /, " ");
        });
        if (bl) hs.blsId = bl.blsId;
        else console.log("bowler not found");
      });
      weekHighsData.data.sort(function(a, b) {
        if (a.type != b.type) {
          if (a.type > b.type) return 1;
          if (a.type < b.type) return -1;
          return 0;
        }
        if (a.score > b.score) return -1;
        if (a.score < b.score) return 1;
        return 0;
      });
      // update scores

      console.log("scoresUpdate: ");
      console.log("date", scoreArr[0].date.toString());
      //console.log('date is ', typeof(scoreArr[0].date));

      scoreArr.forEach(function(obj) {
        obj.date = new Date(obj.date);
      });

      await db.collection("scores").deleteMany({
        league: scoreArr[0].league,
        week: scoreArr[0].week
      });
      var res = await db.collection("scores").insertMany(scoreArr);

      console.log("scores successfully updated");
      fs.appendFileSync(utils.logFile, "\r\n... successfully updated scores");

      // now highScores
      await db.collection("highScores").deleteMany({
        leagueName: aboutObj.displayName,
        week: weekHighsData.week
      });
      // add the season to the data
      weekHighsData.data.forEach(function(obj) {
        obj.season = aboutObj.season;
        obj.league = aboutObj.name;
      });
      console.log("highScores deleted", weekHighsData.name);
      let highScoreData = weekHighsData.data;
      // fix 4 game series by remove 4th game
      if (
        aboutObj.name === "TuesdayDoubles" ||
        aboutObj.name === "tuesdaySummerDoubles"
      )
        highScoreData = weekHighsData.data.map(s => {
          // find the series
          let tmp = s.type.match(/erie/);
          if (tmp) {
            // find 4th game
            let theValue = scoreArr.find(
              val => val.blsId === s.blsId && val.number === 4
            );
            if (theValue) {
              s.score = s.score - theValue.game;
            } else {
              console.log("Can't find 4th game");
            }
          }
          return s;
        });

      res = await db.collection("highScores").insertMany(highScoreData);
      console.log(" highScores successfully updated");
      fs.appendFileSync(
        utils.logFile,
        "\r\n... successfully updated highScores"
      );

      // bowlers update

      console.log("bowlersUpdate: ");
      const bowlerIds = bowlersArr.map(b => b.blsId);
      res = await db.collection("bowlers").deleteMany({
        blsId: { $in: bowlerIds },
        leagueName: aboutObj.name,
        season: aboutObj.season
      });
      console.log("bowlers deleted", res.deletedCount);
      res = await db.collection("bowlers").insertMany(bowlersArr);

      console.log("bowlers update done", res.insertedCount);
      // fix up the date on the about object so its a real date

      aboutObj.date = utils.dateFromString(sheetDate);

      // add ids to weekHighsData
      // make a map bowler names to blsid
      var bmap = rosterData.data.map(t => {
        return t.bowlers;
      });
      bmap = _.reduce(
        bmap,
        function(res, b) {
          //console.log(res);
          return res.concat(b);
        },
        []
      );
      bmap = _.reduce(
        bmap,
        function(res, b) {
          //console.log(res);
          res[b.name.replace(/ .\. /, " ")] = b.id;
          return res;
        },
        {}
      );
      var theKeys = _.keys(highsData.data);

      for (var i = 0; i < theKeys.length; i++) {
        //console.log('hey');
        //console.log(theKeys[i])
        var ks = _.keys(highsData.data[theKeys[i]]);
        //console.log(ks);
        for (var ii = 0; ii < ks.length; ii++) {
          //console.log(ks[ii]);
          if (!highsData.data[theKeys[i]][ks[ii]]) {
            console.log("no scores");
            break;
          }
          var scores = highsData.data[theKeys[i]][ks[ii]].scores;
          for (var s = 0; s < scores.length; s++) {
            if (ks[ii].match(/team/)) {
              var t = _.find(rosterData.data, function(t) {
                var rx = new RegExp(scores[s].name.replace("/", " "));
                //console.log(o.name, t, '---');
                return t.teamName.match(rx);
              });
              if (t) {
                //console.log('found team', t.teamName);
                highsData.data[theKeys[i]][ks[ii]].scores[s]["id"] = t.teamId;
              } else {
                console.log("team not found line 517 scraper");
              }
            } else {
              //remove middle
              var name = scores[s].name;
              highsData.data[theKeys[i]][ks[ii]].scores[s]["id"] = bmap[name];
            }
          }
        }
      }
      // add to highAverages
      if (
        highAvesData.data.highAverageA &&
        highAvesData.data.highAverageA.scores
      ) {
        var arr = highAvesData.data.highAverageA.scores;
        for (var i = 0; i < arr.length; i++) {
          arr[i]["id"] = bmap[arr[i].name];
        }
      }
      // and B
      if (
        highAvesData.data.highAverageB &&
        highAvesData.data.highAverageB.scores
      ) {
        var arr = highAvesData.data.highAverageB.scores;
        for (var i = 0; i < arr.length; i++) {
          arr[i]["id"] = bmap[arr[i].name];
        }
      }
      // write out the data files
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".roster.json",
        JSON.stringify(rosterData),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".json",
        JSON.stringify(standingData),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".high.json",
        JSON.stringify(highsData),
        {
          flag: "w"
        }
      );

      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".review.json",
        JSON.stringify(reviewData),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".about.json",
        JSON.stringify(aboutObj),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".highAverages.json",
        JSON.stringify(highAvesData),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".alpha.json",
        JSON.stringify(alphaData),
        {
          flag: "w"
        }
      );
      fs.writeFileSync(
        utils.outputFolder +
          aboutObj.name +
          sheetDate.replace(/\//g, ".") +
          "---Week-" +
          aboutObj.week +
          "-of-" +
          aboutObj.weekOf +
          ".weekHighs.json",
        JSON.stringify(weekHighsData),
        {
          flag: "w"
        }
      );
      var theObject = [
        aboutObj,
        standingData,
        rosterData,
        reviewData,
        highsData,
        alphaData,
        highAvesData,
        weekHighsData
      ];
      await Promise.all(
        theObject.map(async obj => {
          await db.collection("sheetData").replaceOne(
            {
              name: obj.name,
              week: obj.week,
              season: obj.season,
              type: obj.type
            },
            obj,
            {
              upsert: true
            }
          );
          fs.appendFileSync(
            utils.logFile,
            "\r\n" + obj.name + " " + obj.type + "\r\n... successfully updated "
          );
          console.log(
            obj.name + " " + obj.type + "\r\n... successfully updated "
          );
        })
      );

      let items = await db
        .collection("highAves")
        .find(
          {
            season: aboutObj.season
          },
          {
            _id: 0
          }
        )
        .toArray();
      console.log("high averages:", items.length);
      let menCurrent = [];
      let womenCurrent = [];
      if (items.length > 0) {
        // remove all entries from this league so they can be updated
        menCurrent = items
          .filter(o => o.sex === "m" && o.league !== aboutObj.name)
          .sort((a, b) => b.ave - a.ave);
        womenCurrent = items
          .filter(o => o.sex === "w" && o.league !== aboutObj.name)
          .sort((a, b) => b.ave - a.ave);
        //console.log('highMen:', menCurrent);
        //console.log('highWomen:', womenCurrent[0]);
        //remove duplicates using blsid
      }
      const menTop = getTopTen("m")
        .concat(menCurrent)
        .sort((a, b) => b.ave - a.ave);
      let newMen = menTop;
      if (menTop[9]) {
        console.log("bottom high ave", menTop[9].ave);
        newMen = menTop.filter((o, i, a) => o.ave >= a[9].ave);
      }
      //console.log('men', newMen);

      const womenTop = getTopTen("w")
        .concat(womenCurrent)
        .sort((a, b) => b.ave - a.ave);
      let newWomen = womenTop;
      if (newWomen[9]) {
        console.log("bottom high ave women", newWomen[9].ave);
        newWomen = womenTop.filter((o, i, a) => o.ave >= a[9].ave);
      }

      await db.collection("highAves").deleteMany({});
      await db.collection("highAves").insertMany(newMen.concat(newWomen));
      console.log("highAves insert good");

      console.log("highAves update faile");

      console.log(JSON.stringify(aboutObj.displayName));
      console.log("done!");
      // check for old file  in the output folder and delete them
      utils.deleteOldOutputFiles();
      utils.truncateLogFile();
      var endingTime = moment();
      logData =
        "\r\nTaking " +
        endingTime.diff(rightNow, "seconds", true) +
        " seconds\r\nEnding: " +
        aboutObj.name +
        " " +
        sheetDate +
        " week: " +
        aboutObj.week;
      fs.appendFileSync(utils.logFile, logData);
      if (mail) {
        this.sendMailUpdated(aboutObj, emailList);
        await db.collection("updated").replaceOne(
          {
            name: aboutObj.name,
            season: aboutObj.season,
            week: aboutObj.week
          },
          {
            name: aboutObj.name,
            season: aboutObj.season,
            week: aboutObj.week,
            now: aboutObj.now
          },
          {
            upsert: true
          }
        );

        console.log("updated collection", "updated successfully updated");
        fs.appendFileSync(utils.logFile, "\r\nupdated Updated: ");
        // audit the league
        res = await db
          .collection("sheetData")
          .find(
            {
              type: "about",
              season: aboutObj.season,
              name: aboutObj.name
            },
            {
              week: 1,
              _id: 0
            }
          )
          .sort({
            week: -1
          })
          .toArray();

        console.log("auditing ... ");
        const wks = res.map(o => {
          return o.week;
        });
        if (wks.length != wks[0]) {
          console.log("we have missing week");
          const allWeeks = _.range(1, wks[0]);
          const missing = _.pullAll(allWeeks, wks);
          const msg = `${aboutObj.displayName} is missing weeks ${missing}`;
          console.log(msg);
          if (mail) this.sendMailWeeksMissing(aboutObj, msg, db);
        }
        // update the league
        await db.collection("leagues").updateOne(
          {
            _id: leagueObj._id
          },
          {
            $set: {
              count: wks.length,
              auditFail: wks.length !== wks[0]
            }
          }
        );

        console.log("league count updated");
        fs.appendFileSync(utils.logFile, "\r\nleagueCount updated:");

        await doSixOverAve(aboutObj, nodemailerMailgun, db);
        res = await dbConnect.close();
        console.log("Db connection closed", res ? res : "ok");
      } else {
        console.log("Not sending mail....");
        res = await dbConnect.close();
        console.log("Db connection closed", res ? res : "ok");
      }

      function getTopTen(sex) {
        const topTen = [];
        if (highAvesData.data.highAverageA)
          rosterData.data.forEach(t => {
            t.bowlers.forEach(b => {
              if (b.sex === sex && b.games > 6 && b.pins > 0) {
                // uniq is needed to prevent duplicates in the same league
                topTen.push({
                  name: b.name,
                  id: b.id,
                  ave: b.pins / b.games,
                  games: b.games,
                  league: aboutObj.name,
                  season: aboutObj.season,
                  sex: sex
                });
              }
            });
          });
        topTen.sort((a, b) => b.ave - a.ave);
        return topTen.slice(0, 10);
      }

      function addGenderToRoster() {
        var theData = {};
        rosterData.data.forEach(function(item) {
          item.bowlers.forEach(function(b) {
            var gender = getNameAndGender(b.name);
            if (gender !== undefined) {
              b.sex = gender.sex.toLowerCase();
              theData[gender.name] = gender.sex.toLowerCase();
            } else {
              const bowler = _.find(bowlerGenderList, {
                name: b.name
              });
              if (bowler) {
                b.sex = bowler.sex;
                theData[b.name] = bowler.sex ? bowler.sex : "m";
              }
            }
          });
        });
        return theData;
      }

      function getNameAndGender(name) {
        return _.find(alphaData.data, function(b) {
          return b.name === name;
        });
      }

      function getNameAndGenderNoMiddle(name) {
        return _.find(alphaData.data, function(b) {
          const noMid = b.name.replace(/ \w\. /, " ");
          return noMid === name;
        });
      }
    } catch (err) {
      console.log(err.stack);
      if (mail) {
        fs.appendFileSync(utils.logFile, "EXCEPTION: " + err.stack + "\r\n");
        // send me an email
        nodemailerMailgun.sendMail(
          {
            from: "admin@cornerpins.com",
            to: [process.env.EMAIL_ME, process.env.EMAIL_LONNIE], // An array if you have multiple recipients.
            subject: "Double Decker Lanes Exception Scrapping ",
            "h:Reply-To": process.env.EMAIL_ME,
            text: "Exception: " + err.stack
          },
          function(err, info) {
            if (err) {
              fs.appendFileSync(
                utils.logFile,
                "Email send  error occurred: " + " - " + err
              );
              console.log("Error in email send: " + err);
            } else {
              console.log("mail sent ok", info);
              fs.appendFileSync(utils.logFile, "Mail sent to paul: ");
            }
          }
        );
        return;
      }
    }
  }
  sendMailUpdated(about, elist) {
    var date = about.date.toDateString();
    let emailList = [];
    elist.forEach(function(item) {
      //console.log(JSON.stringify(item));
      if (meOnly && item.email.match(/ocks/)) {
        console.log("meOnly");
        emailList.push(item.email);
      }
      if (!meOnly) emailList.push(item.email);
    });
    if (emailList.length === 0) {
      console.log("no emails to send!!!");
      return;
    }

    nodemailerMailgun.sendMail(
      {
        from: "admin@cornerpins.com",
        to: emailList, // An array if you have multiple recipients.
        subject:
          "League Update for " + about.displayName + " week " + about.week,
        "h:Reply-To": process.env.EMAIL_ME,
        //You can use "html:" to send HTML email content. It's magic!
        html:
          "<html><p>Greetings from the DoublDecker Leagues Website</p><p><a href=" +
          "http://cornerpins.com/standings/" +
          encodeURIComponent(about.name) +
          ">" +
          about.displayName +
          "</a> for week " +
          about.week +
          " - " +
          date +
          ", has been updated. </p></html>",
        //You can use "text:" to send plain-text content. It's oldschool!
        text: "League update ... should not see this!!"
      },
      function(err, info) {
        if (err) {
          fs.appendFileSync(
            utils.logFile,
            "Email send  error occurred: " + " - " + err
          );
          console.log("Error in email send: " + err);
        } else {
          //console.log('mail sent ok', info);
          fs.appendFileSync(
            utils.logFile,
            "Mail sent: " + emailList.toString()
          );
        }
      }
    );
  }

  sendMailWeeksMissing(about, msg, db) {
    var date = about.date.toDateString();
    db.collection("email")
      .find({
        leagues: {
          $in: ["*", about.name]
        },
        enabled: true
      })
      .toArray(function(err, items) {
        if (err) {
          console.log("Error getting league list:", err);

          fs.appendFileSync(
            utils.logFile,
            "\r\nfailed getting league list ...  not processsing"
          );
          return;
        } else {
          var emailList = [];
          items.forEach(function(item) {
            //console.log(JSON.stringify(item));
            if (meOnly && item.email.match(/ocks/)) {
              console.log("meOnly");
              emailList.push(item.email);
            }
            if (!meOnly) emailList.push(item.email);
          });
          if (emailList.length === 0) {
            console.log("no emails to send!!!");
            return;
          }

          nodemailerMailgun.sendMail(
            {
              from: "admin@cornerpins.com",
              to: emailList, // An array if you have multiple recipients.
              subject:
                "League Audit Error for " +
                about.displayName +
                " week " +
                about.week,
              "h:Reply-To": process.env.EMAIL_ME,
              //You can use "html:" to send HTML email content. It's magic!
              html:
                "<html><p>Greetings from the DoublDecker Leagues Website</p><p><a href=" +
                "http://cornerpins.com/standings/" +
                encodeURIComponent(about.name) +
                ">" +
                about.displayName +
                "</a> for week " +
                about.week +
                " - " +
                date +
                ", has the following issue. </p><p>" +
                msg +
                "</p></html>",
              //You can use "text:" to send plain-text content. It's oldschool!
              text: "League update ... should not see this!!"
            },
            function(err, info) {
              if (err) {
                fs.appendFileSync(
                  utils.logFile,
                  "Email send  error occurred: " + " - " + err
                );
                console.log("Error in email send: " + err);
              } else {
                console.log("mail sent ok", info);
                fs.appendFileSync(
                  utils.logFile,
                  "Mail sent: " + emailList.toString()
                );
              }
            }
          );
        }
      });
  }
}
module.exports = Scraper;
