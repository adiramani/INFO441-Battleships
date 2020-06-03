FROM alpine
RUN apk update && apk add ca-certificates
COPY gameplay /gameplay
EXPOSE 443
ENTRYPOINT ["/gameplay"]