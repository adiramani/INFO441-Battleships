sh C:/Users/Adi/Documents/go/src/github.com/FlaredHeart28/INFO441-Battleships/client/newClient/build.sh
docker push adiramani/info441website
ssh ec2-user@dr4gonhouse.me 'docker pull adiramani/info441website && docker rm -f website && docker run -d -p 443:443 -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt:ro --name website adiramani/info441website'
