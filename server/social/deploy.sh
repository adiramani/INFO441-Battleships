#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/server/social/build.sh
docker push adiramani/socialmicrosrv
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/socialmicrosrv && docker rm -f social && docker run -d -e MYSQLADDR="database,root,password,userDB" --network dragonnet --name social adiramani/socialmicrosrv'