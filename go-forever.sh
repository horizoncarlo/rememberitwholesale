#!/bin/bash
# 'forever' is installed via npm
# Then we can use it with 'nodemon' to ensure if the server crashes
#  we can auto-restart it
# See https://github.com/remy/nodemon/blob/master/faq.md#using-nodemon-with-forever
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
nvm use 20 &> /dev/null

screen -d -S node -m forever start --killSignal=SIGTERM -c 'npm run backend-forever'
