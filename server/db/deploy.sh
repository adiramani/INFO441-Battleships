#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/server/db/build.sh
docker push adiramani/userdb
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/userdb && docker rm -f database && docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=userDB --network dragonnet --name database adiramani/userdb'
