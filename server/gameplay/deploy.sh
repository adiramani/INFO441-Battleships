#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/server/gameplay/build.sh
docker push adiramani/gameplaymicrosrv
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/gameplaymicrosrv && docker rm -f gameplay && docker run -d --network dragonnet --name gameplay adiramani/gameplaymicrosrv'