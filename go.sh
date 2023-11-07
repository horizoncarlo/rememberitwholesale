#!/bin/bash
# Fire up the various parts of our app in separate screen instances
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
nvm use 18

./go-node.sh
./go-angular.sh

# List our screens and notify the user
screen -ls
echo -e
echo "Started node and angular"
