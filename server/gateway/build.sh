GOOS=linux
go build
docker build -t adiramani/gateway .
go clean