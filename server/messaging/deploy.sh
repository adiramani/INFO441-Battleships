#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/server/messaging/build.sh
docker push adiramani/messagesmicrosrv
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/messagesmicrosrv && docker rm -f messages && docker run -d -e MONGOADDR="mongodb://mongodb:27017/chat" -e MYSQLADDR="database,root,password,userDB" --network dragonnet --name messages adiramani/messagesmicrosrv'