"use strict";
var fs = require("fs-extra");
var path = require("path");
var utils = require("./scraper/utils");

var Scraper = require("./scraper/scraper");

var root = path.normalize(__dirname);
var logFile = utils.logFile;
var moment = require("moment");
var _ = require("lodash");

var archiver = require("archiver");

var nodemailer = require("nodemailer");

var mg = require("nodemailer-mailgun-transport");
require('dotenv').config()
// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
//Your api key, from Mailgun’s Control Panel
var api_key = process.env.EMAIL_API_KEY;

//Your domain, from the Mailgun Control Panel
var domain = process.env.EMAIL_DOMAIN;
var auth = {
  auth: {
    api_key: api_key,
    domain: domain
  }
};
var nodemailerMailgun = nodemailer.createTransport(mg(auth));

console.log("root: ", path.normalize(__dirname));
console.log("watching: ", utils.watchFolder);

fs.watch(utils.watchFolder, function(event, fileName) {
  if (
    event === "rename" &&
    fileName !== null &&
    (fileName.match(/\.html/i) || fileName.match(/\.zip/i))
  ) {
    // check if rename is actually a delete
    if (fs.existsSync(utils.watchFolder + fileName) === false) {
      return;
    }
    console.log("Event: " + event);
    console.log(fileName + "\n");

    setTimeout(function() {
      try {
        var thePath = utils.outputFolder + fileName;
        console.log("out from: ", utils.watchFolder + fileName);
        console.log("out to: ", thePath);
        fs.renameSync(utils.watchFolder + fileName, thePath);

        console.log("logFile: ", logFile);
        if (fileName.match(/\.html/i)) {

          var zipName = thePath.replace(/\.html/i, ".zip");
          console.log("zip name: ", zipName);
          const archive = archiver("zip");
          archive.on("error", function(err) {
            throw err;
          });

          const writer = fs.createWriteStream(zipName);
          archive.on("end", () => {
            console.log("writer has been closed .");
            // the archive is really not ready so we wait a bit
            setTimeout(() => {
              sendZip(fileName, zipName);
              const theScraper = new Scraper(thePath)
              theScraper.doFile()
            }, 1000);
          });
          archive.pipe(writer);
          console.log("zip appending: ", thePath);
          archive
            .append(fs.createReadStream(thePath), {
              name: fileName
            })
            .finalize();
          console.log("archiver -------------------> sent to", zipName);
        }
        fs.appendFileSync(logFile, "Done with: " + thePath + "\n");
        console.log("Done with: " + thePath);
      } catch (e) {
        console.log("Watcher Exception: ", e);
        fs.appendFileSync(
          logFile,
          "EXCEPTION in watcher league trying rename: " + e + "\n"
        );
      }
    }, 2000);
  }
});

const sendZip = (name, zipFilePath) => {
  console.log("name", name, "path", zipFilePath);
  nodemailerMailgun.sendMail(
    {
      from: "admin@cornerpins.com",
      to: process.env.EMAIL_ME,
      subject: `Scraping file ${name}`,
      "h:Reply-To": process.env.EMAIL_ME,
      text: "Processed file",
      attachments: [
        {
          filename: name.replace(/\.html/i, ".zip"),
          path: zipFilePath
        }
      ]
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
};
