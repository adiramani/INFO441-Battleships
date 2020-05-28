#!/bin/bash
sh C:/Users/Adi/Documents/go/src/github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/build.sh
docker push adiramani/gateway
ssh ec2-user@api.dr4gonhouse.me 'docker pull adiramani/gateway && docker rm -f gateway && docker run -d -p 443:443 -v /etc/letsencrypt:/etc/letsencrypt:ro -e TLSCERT=/etc/letsencrypt/live/api.dr4gonhouse.me/fullchain.pem -e TLSKEY=/etc/letsencrypt/live/api.dr4gonhouse.me/privkey.pem -e DSN="root:password@tcp(database:3306)/userDB" -e SESSIONKEY=HashKey -e REDISADDR=redisServer:6379 -e MESSAGESADDR=messages:80 -e SUMMARYADDR=summary:80 -e SOCIALADDR=social:80 --network dragonnet --name gateway adiramani/gateway'
