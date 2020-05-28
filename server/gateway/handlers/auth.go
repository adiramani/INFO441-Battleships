package handlers

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"path"
	"strconv"

	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/sessions"

	"golang.org/x/crypto/bcrypt"
	"strings"
	"time"
)

// UsersHandler is a function used to handle the general Users path
func (hc *HandlerContext) UsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if r.Header.Get("Content-Type") != "application/json" {
			http.Error(w, "Response must be of type application/json", http.StatusUnsupportedMediaType)
			return
		}
		newUser := &users.NewUser{}
		jsonResponseBody, _ := ioutil.ReadAll(r.Body)
		err := json.Unmarshal([]byte(jsonResponseBody), newUser)
		if err != nil {
			http.Error(w, "Unable to unpack json into new user", http.StatusBadRequest)
			return
		}
		err = newUser.Validate()
		if err != nil {
			http.Error(w, "Validation Error: "+err.Error(), http.StatusBadRequest)
			return
		}
		user, err := newUser.ToUser()
		if err != nil {
			http.Error(w, "To User Error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		finalUser, err := hc.UserStore.Insert(user)
		if err != nil {
			http.Error(w, "Insert Error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		sessionState := &SessionState{
			StartTime: time.Now(),
			User:      *finalUser,
		}
		_, err = sessions.BeginSession(hc.SignKey, hc.SessStore, sessionState, w)
		w.Header().Set("Content-Type", "application/json")
		toWrite, _ := json.Marshal(finalUser)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(toWrite))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

// SpecficUserHandler is a function used to handle specific users
func (hc *HandlerContext) SpecficUserHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	authUserSessID := sessions.SessionID(strings.TrimPrefix(auth, "Bearer "))
	sessState := &SessionState{}
	err := hc.SessStore.Get(authUserSessID, sessState)
	if err != nil {
		http.Error(w, "Unauthorized user", http.StatusUnauthorized)
		return
	}

	if r.Method == "GET" {
		userID := int64(-1)
		if path.Base(r.URL.Path) == "me" {
			userID = sessState.User.ID
		} else {
			userID, _ = strconv.ParseInt(path.Base(r.URL.Path), 10, 64)
		}
		user, err := hc.UserStore.GetByID(userID)
		if err != nil {
			http.Error(w, "Unable to find user", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		toWrite, _ := json.Marshal(user)
		w.Write([]byte(toWrite))
	} else if r.Method == "PATCH" {
		if path.Base(r.URL.Path) != "me" {
			urlID, _ := strconv.ParseInt(path.Base(r.URL.Path), 10, 64)
			if urlID != sessState.User.ID {
				http.Error(w, "Authenticated user doesn't match with user passed in", http.StatusForbidden)
				return
			}
		}
		if r.Header.Get("Content-Type") != "application/json" {
			http.Error(w, "Request body must be in json", http.StatusUnsupportedMediaType)
			return
		}
		jsonResponseBody, _ := ioutil.ReadAll(r.Body)
		updates := &users.Updates{}
		err = json.Unmarshal([]byte(jsonResponseBody), updates)
		if err != nil {
			http.Error(w, "Unable to unpack json into update", http.StatusBadRequest)
			return
		}
		updatedUser, err := hc.UserStore.Update(sessState.User.ID, updates)
		if err != nil {
			http.Error(w, "Unable to update user: "+err.Error(), http.StatusInternalServerError)
			return
		}
		sessState.User = *updatedUser
		err = hc.SessStore.Save(authUserSessID, sessState)
		if err != nil {
			http.Error(w, "Unable to update user: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		toWrite, _ := json.Marshal(updatedUser)
		w.Write([]byte(toWrite))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

// SessionsHandler is used to create a session
func (hc *HandlerContext) SessionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if r.Header.Get("Content-Type") != "application/json" {
			http.Error(w, "Body must be in json", http.StatusUnsupportedMediaType)
			return
		}
		cred := &users.Credentials{}
		jsonResponseBody, _ := ioutil.ReadAll(r.Body)
		err := json.Unmarshal(jsonResponseBody, cred)
		if err != nil {
			http.Error(w, "Unable to unpack json into credentials", http.StatusBadRequest)
			return
		}
		user, err := hc.UserStore.GetByEmail(cred.Email)
		if err != nil {
			bcrypt.GenerateFromPassword([]byte(cred.Password), bcrypt.DefaultCost)
			http.Error(w, "Unable to find Email or Password", http.StatusUnauthorized)
			return
		}
		err = bcrypt.CompareHashAndPassword(user.PassHash, []byte(cred.Password))
		if err != nil {
			http.Error(w, "Unable to find Email or Password", http.StatusUnauthorized)
			return
		}
		sessionState := &SessionState{
			StartTime: time.Now(),
			User:      *user,
		}
		_, err = sessions.BeginSession(hc.SignKey, hc.SessStore, sessionState, w)
		if err != nil {
			http.Error(w, "Unable to begin session", http.StatusInternalServerError)
			return
		}

		//w.Header().Set("Authorization", "Bearer "+string(sessID))
		w.Header().Set("Content-Type", "application/json")
		toWrite, _ := json.Marshal(user)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(toWrite))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

// SpecificSessionHandler is used to delete a specific session
func (hc *HandlerContext) SpecificSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "DELETE" {
		if path.Base(r.URL.Path) != "mine" {
			http.Error(w, "To delete session, end of path must be 'mine'", http.StatusForbidden)
			return
		}
		_, err := sessions.EndSession(r, hc.SignKey, hc.SessStore)
		if err != nil {
			http.Error(w, "Unable to end session: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Write([]byte("Signed out"))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}
