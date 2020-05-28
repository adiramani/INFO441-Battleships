package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"net/http"
	// Need to make an insert on sql table, don't have db connection
	_ "github.com/go-sql-driver/mysql"
	"io/ioutil"
	"os"
	"time"
)

// CORS is a struct used to handle CORS
type CORS struct {
	Handler http.Handler
}

// ServeHTTP Adds CORS Headers to the response
func (c *CORS) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Expose-Headers", "Authorization")
	w.Header().Set("Access-Control-Max-Age", "600")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Used to check if a sign in is being attempted, and logging the attempt in a table
	// Could be done with less code in a different function (such as SessionsHandler)
	// But it would cause tests to fail.
	if r.Method == "POST" && r.URL.Path == "/v1/sessions" {
		if r.Header.Get("Content-Type") != "application/json" {
			http.Error(w, "Body must be in json", http.StatusUnsupportedMediaType)
			return
		}
		cred := &users.Credentials{}
		jsonResponseBody, _ := ioutil.ReadAll(r.Body)
		r.Body = ioutil.NopCloser(bytes.NewReader([]byte(jsonResponseBody)))
		err := json.Unmarshal(jsonResponseBody, cred)
		if err != nil {
			http.Error(w, "Unable to unpack json into credentials", http.StatusBadRequest)
			return
		}
		dsn := os.Getenv("DSN")
		db, err := sql.Open("mysql", dsn)
		if err != nil {
			http.Error(w, "Unable to open database", http.StatusInternalServerError)
		}
		defer db.Close()
		row, err := db.Query("SELECT id FROM user WHERE email=?", cred.Email)
		if err == nil && row.Next() {
			// For updating the user stats table
			id := -1
			err = row.Scan(&id)
			if err == nil {
				insert := "INSERT INTO user_stats (id, date_time, client_ip) VALUES (?, ?, ?)"
				ip := r.Header.Get("X-Forwarded-For")
				if len(ip) == 0 {
					ip = r.RemoteAddr
				}
				t := time.Now()
				t.Format(time.RFC3339)
				_, err = db.Exec(insert, id, t, ip)
			}
		}
	}

	c.Handler.ServeHTTP(w, r)
}
