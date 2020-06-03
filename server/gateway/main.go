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
		addr = ":4443"
	}

	TLSCERT := os.Getenv("TLSCERT")
	TLSKEY := os.Getenv("TLSKEY")
	SESSIONKEY := os.Getenv("SESSIONKEY")
	REDISADDR := os.Getenv("REDISADDR")
	DSN := os.Getenv("DSN")
	SUMMARYADDR := strings.Split(os.Getenv("SUMMARYADDR"), ",")
	MESSAGESADDR := strings.Split(os.Getenv("MESSAGESADDR"), ",")
	SOCIALADDR := os.Getenv("SOCIALADDR")
	GAMEADDR := os.Getenv("GAMEADDR")

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

	summaryCount := 0
	summaryDirector := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = SUMMARYADDR[summaryCount]
		r.URL.Host = SUMMARYADDR[summaryCount]
		r.URL.Scheme = "http"
		if len(SUMMARYADDR) > summaryCount+1 {
			summaryCount++
		}
	}
	summaryProxy := &httputil.ReverseProxy{Director: summaryDirector}

	messageCount := 0
	messageDirector := func(r *http.Request) {
		auth := r.Header.Get("Authorization")
		if len(auth) == 0 {
			auth = r.URL.Query().Get("auth")
			log.Printf("Auth: %s" + auth)
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
		authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
		sessState := &handlers.SessionState{}
		err := handlerContext.SessStore.Get(authUserSessID, sessState)
		if err == nil {
			r.Header.Set("X-User", fmt.Sprintf("{\"userID\":%d}", sessState.User.ID))
		} else {
			r.Header.Del("X-User")
		}

		r.Host = GAMEADDR
		r.URL.Host = GAMEADDR
		r.URL.Scheme = "http"
	}
	gameProxy := &httputil.ReverseProxy{Director: gameDirector}

	mux := http.NewServeMux()

	mux.Handle("/v1/summary", summaryProxy)
	mux.Handle("/v1/channels", messageProxy)
	mux.Handle("/v1/channels/", messageProxy)
	mux.Handle("/v1/messages/", messageProxy)
	mux.Handle("/v1/friends", socialProxy)
	mux.Handle("/v1/friends/", socialProxy)
	mux.Handle("/v1/game/", gameProxy)
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
