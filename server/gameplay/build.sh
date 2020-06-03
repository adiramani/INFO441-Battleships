GOOS=linux
go build
docker build -t adiramani/gameplaymicrosrv .
go clean