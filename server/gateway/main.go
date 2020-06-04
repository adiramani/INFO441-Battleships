package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"time"

	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/handlers"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/sessions"
	"github.com/go-redis/redis"
	_ "github.com/go-sql-driver/mysql"
)

//main is the main entry point for the server
func main() {
	addr := os.Getenv("ADDR")
	if len(addr) == 0 {
		addr = ":443"
	}

	TLSCERT := os.Getenv("TLSCERT")
	TLSKEY := os.Getenv("TLSKEY")
	SESSIONKEY := os.Getenv("SESSIONKEY")
	REDISADDR := os.Getenv("REDISADDR")
	DSN := os.Getenv("DSN")
	MESSAGESADDR := strings.Split(os.Getenv("MESSAGESADDR"), ",")
	SOCIALADDR := os.Getenv("SOCIALADDR")
	GAMEADDR1 := os.Getenv("GAMEADDR1")
	GAMEADDR2 := os.Getenv("GAMEADDR2")

	if len(REDISADDR) == 0 {
		REDISADDR = "127.0.0.1:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: REDISADDR,
	})
	redisStore := sessions.NewRedisStore(rdb, time.Hour)

	db, err := sql.Open("mysql", DSN)
	if err != nil {
		os.Stderr.WriteString("Unable to open database: " + err.Error())
		os.Exit(1)
	}
	mySQLStore := users.NewMySQLStore(db)

	if len(TLSCERT) == 0 || len(TLSKEY) == 0 {
		os.Stderr.WriteString("TLSCERT or TLSTKEY not defined.")
		os.Exit(1)
	}

	handlerContext := &handlers.HandlerContext{
		SignKey:   SESSIONKEY,
		SessStore: redisStore,
		UserStore: mySQLStore,
	}

	messageCount := 0
	messageDirector := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		if len(auth) == 0 {
			auth = r.URL.Query().Get("auth")
		}
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = MESSAGESADDR[messageCount]
		r.URL.Host = MESSAGESADDR[messageCount]
		r.URL.Scheme = "http"
		if len(MESSAGESADDR) > messageCount+1 {
			messageCount++
		}
	}
	messageProxy := &httputil.ReverseProxy{Director: messageDirector}

	socialDirector := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = SOCIALADDR
		r.URL.Host = SOCIALADDR
		r.URL.Scheme = "http"
	}
	socialProxy := &httputil.ReverseProxy{Director: socialDirector}

	gameDirector := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		if len(auth) == 0 {
			auth = r.URL.Query().Get("auth")
		}
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = GAMEADDR1
		r.URL.Host = GAMEADDR1
		r.URL.Scheme = "http"
	}
	gameProxy := &httputil.ReverseProxy{Director: gameDirector}

	gameDirector2 := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = GAMEADDR2
		r.URL.Host = GAMEADDR2
		r.URL.Scheme = "http"
	}
	gameProxy2 := &httputil.ReverseProxy{Director: gameDirector2}

	mux := http.NewServeMux()

	mux.Handle("/v1/channels", messageProxy)
	mux.Handle("/v1/channels/", messageProxy)
	mux.Handle("/v1/messages/", messageProxy)
	mux.Handle("/v1/friends", socialProxy)
	mux.Handle("/v1/friends/", socialProxy)
	mux.Handle("/v1/game", gameProxy2)
	mux.Handle("/v1/game/play/", gameProxy)
	mux.Handle("/v1/game/", gameProxy2)
	mux.HandleFunc("/v1/users", handlerContext.UsersHandler)
	mux.HandleFunc("/v1/users/", handlerContext.SpecficUserHandler)
	mux.HandleFunc("/v1/sessions", handlerContext.SessionsHandler)
	mux.HandleFunc("/v1/sessions/", handlerContext.SpecificSessionHandler)
	cors := &handlers.CORS{
		Handler: mux,
	}
	log.Printf("Listening in on Port %s.", addr)
	log.Fatal(http.ListenAndServeTLS(addr, TLSCERT, TLSKEY, cors))

}
