#!/bin/bash

cd /opt
rm -rf buildScraper
mkdir buildScraper
cd buildScraper
git clone git@gitlab.com:stocksp/scraper-node.git .
npm install --production

systemctl stop scraper.service
rsync -a ./ ../srcaper
systemctl start acc.scaper
