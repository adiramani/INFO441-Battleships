#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/server/gamemeta/build.sh
docker push adiramani/gamemetamicrosrv
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/gamemetamicrosrv && docker rm -f gamemeta && docker run -d -e MONGOADDR="mongodb://mongodb:27017/chat" -e MYSQLADDR="database,root,password,userDB" --network dragonnet --name gamemeta adiramani/gamemetamicrosrv'