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
npm run build &&
scp -P $thornport -r dist/ $thornh:/home/drone/ &&
ssh $thorn '
echo "Removing old backup" ;
rm -rf /var/www/backup/html_old/ ;
echo "Backing up current html/ folder" ;
mv /var/www/backup/html/ /var/www/backup/html_old/ ;
mkdir /var/www/backup/html/ ;
mv /var/www/html/* /var/www/backup/html/ ;
echo "Copying in new dist/ files" ;
mv /home/drone/dist/* /var/www/html/ &&
rmdir /home/drone/dist/ &&
echo "Doing Node work" ;
source /home/drone/.bashrc &&
cd /home/drone/hub/rememberitwholesale/ &&
nvm use 20 &&
echo "Pulling from Git" ;
git pull &&
echo "Doing npm i (a bit long)" ;
npm i &&
echo "Restarting pm2" ;
pm2 restart maindata &&
echo "All done"
'
