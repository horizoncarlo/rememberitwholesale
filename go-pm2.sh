#!/bin/bash
# Use pm2 to ensure our Node process restarts if it crashes
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
nvm use 20 &> /dev/null

NODE_ENV=production pm2 start backend-node/maindata.js --watch &&
screen -d -S pm2 -m pm2 logs
