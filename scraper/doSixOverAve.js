var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
const utils = require('./utils');

const doSixOverAve = async (aboutObj, nodemailerMailgun, db) => {
  try {
    console.log('doSixOverAve');
    var col = db.collection('sheetData');
    const theBowlers = {};
    var items = await col.find({
      type: 'roster',
      season: aboutObj.season,
      name: aboutObj.name
    }).sort({
      week: 1
    }).toArray();
    console.log(`roster count; ${items.count}`);
    // make an average going into table
    // the data has the average AFTER the games have been
    // bowled we need the average the bowler had when he
    // bowled the games
    var preAve = {};
    var preGames = {};
    items.forEach(function (o) {
      o.data.forEach(function (t) {
        t.bowlers.forEach(function (b) {
          // add bowler if we dont have
          if (!preAve[b.id]) {
            preAve[b.id] = {};
          }
          if (!preGames[b.id]) {
            preGames[b.id] = {};
          }
          preAve[b.id][o.week + 1] = b.average;
          preGames[b.id][o.week + 1] = b.games;
          // add the first week
          if (o.week === 1) {
            preAve[b.id][o.week] = b.average;
            preGames[b.id][o.week] = 0;
          }
        });
      });
    });
    // write to the db we use them for individual scores
    var preToDb = [];
    _.forOwn(preAve, function (value, key) {
      preToDb.push({
        league: aboutObj.name,
        blsId: parseInt(key),
        season: aboutObj.season,
        weeks: value
      });
    });
    await db.collection('enterAverages').deleteMany({
      league: aboutObj.name,
      season: aboutObj.season
    });
    await db.collection('enterAverages').insertMany(preToDb);

    items.forEach(function (o) {
      if (o.week < 5)
        return;
      o.data.forEach(function (t) {
        t.bowlers.forEach(function (b) {
          let ave = parseInt(preAve[b.id][o.week]);
          const g1 = parseInt(b.game1);
          const g2 = parseInt(b.game2);
          const g3 = parseInt(b.game3);
          const games = preGames[b.id][o.week];
          // return if they didn't bowl or less than 12.. no scores
          if (games < 12 || !g1 || !g2 || !g3)
            return;
          // add bowler if we dont have
          if (!theBowlers[b.id])
            theBowlers[b.id] = {
              data: [],
              name: b.name
            };
          // over is determined by looking back one week and not
          // by using the current entering average WHEN the previous week
          // is over.  If the previous week is NOT over (or we are at the first entry)
          // then the over is determined by the current entering average.
          let dataLength = theBowlers[b.id].data.length;

          if (dataLength > 0 && theBowlers[b.id].data[dataLength - 1].over === true) {
            const previousWeek = theBowlers[b.id].data[dataLength - 1].week;
            ave = parseInt(preAve[b.id][previousWeek]);
            //console.log('looking back: ', ave, 'was',  parseInt(preAve[b.id][o.week]));
          }



          theBowlers[b.id].data.push({
            week: o.week,
            over: (g1 > ave && g2 > ave && g3 > ave),
            dateStr: `Wk ${o.week}: ` + moment(o.date).format('MMM Do') +
            `, Avg ${ave} - ${g1}, ${g2}, ${g3}`
          })
        });
      });
    });
    var bowlersSorted = _.toPairs(theBowlers);
    var bowlersSorted = _.sortBy(bowlersSorted, function (o) {
      return o[1].name.split(' ').shift();
    })
    var emailData = '';
    var thisWeekData = '';
    _.forEach(bowlersSorted, function (obj) {
      _.forEach(obj[1].data, function (o, i, arr) {
        if (i > 0) {
          if (o.over && arr[i - 1].over) {
            //const thisWeek = moment(aboutObj.date).format('MMM Do');
            emailData += `<h3>${obj[1].name} - ${aboutObj.displayName}</h3><p />`;
            //emailData += `week ${arr[i -1].week} and ${o.week}, `;
            emailData += `${arr[i - 1].dateStr} <br /> ${o.dateStr}`;

            if (o.week === aboutObj.week) {
              thisWeekData += `<h3>${obj[1].name} - ${aboutObj.displayName}</h3><p />`;
              //thisWeekData += `week ${arr[i -1].week} and ${o.week}, `;
              thisWeekData += `${arr[i - 1].dateStr} <br /> ${o.dateStr}`;
            }
            return false;
          }
        }
      })
    });
    if (thisWeekData !== '') {
      thisWeekData = "<h2>NEW THIS WEEK!</h2><p />" + thisWeekData;
      emailData = thisWeekData + "<h2>All the weeks</h2><p />" + emailData;
    } else {
      emailData = "<h2>Nothing new this week ..</h2><p />" + emailData;
    }
    console.log(`done with over ave`);
    fs.writeFileSync(utils.outputFolder + 'overAve.json', JSON.stringify(theBowlers), {
      flag: 'w'
    });
    fs.writeFileSync(utils.outputFolder + 'overAveMail.html', JSON.stringify(emailData), {
      flag: 'w'
    });
    if (emailData !== '') {
      nodemailerMailgun.sendMail({
        from: 'admin@cornerpins.com',
        to: ['LDKelleyb5@gmail.com', 'paul.stocks@gmail.com'], // An array if you have multiple recipients.
        //to: ['paul.stocks@gmail.com'], // An array if you have multiple recipients.
        subject: '6 games over average for ' + aboutObj.displayName + ' week ' + aboutObj.week,
        'h:Reply-To': 'admin@cornerpins.com',
        //You can use "html:" to send HTML email content. It's magic!
        html: `<html><p>Greetings from the DoublDecker Leagues Website</p>${emailData}</html>`,
        //You can use "text:" to send plain-text content. It's oldschool!
        text: emailData
      }, function (err, info) {
        if (err) {
          fs.appendFileSync(utils.logFile, 'Email 6 games over send  error occurred: ' + ' - ' + err);
          console.log('Error in email send: ' + err);
        } else {
          //console.log('mail sent ok', info);
          fs.appendFileSync(utils.logFile, 'Mail sent 6 games over: ');
        }
      });

    }

  } catch (err) {
    console.log(err.stack);
  };
}
module.exports = doSixOverAve;
