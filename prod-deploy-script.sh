#!/bin/bash
# Bunch of manual steps to deploy to our server
# Cleanup our current directory, do a fresh install and build
# Copy the dist/ folder to our server
# Then on the server rotate our html/ backup to html_old/
# Deploy the new dist/ code
# Update our Node instance from Git with a fresh build and pm2 restart
# Some possible failures are mostly around pm2, if the existing screen instance on the server is dead

# ALSO note that config/default.json on the server needs to have Mailjet setup for registration requests

rm -rf dist/
rm -rf node_modules/
npm i
npm run build
echo "Removing old backup"
rm -rf /var/www/backup/riw_old/
echo "Backing up current html/ folder"
mv /var/www/backup/riw/ /var/www/backup/riw_old/
mkdir /var/www/backup/riw/
mv /var/www/riw/* /var/www/backup/riw/
echo "Copying in new dist/ files"
mv dist/* /var/www/riw/
rmdir dist/
