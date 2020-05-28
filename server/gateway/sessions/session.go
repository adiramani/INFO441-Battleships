package sessions

import (
	"errors"
	"net/http"
	"strings"
)

const headerAuthorization = "Authorization"
const paramAuthorization = "auth"
const schemeBearer = "Bearer "

//ErrNoSessionID is used when no session ID was found in the Authorization header
var ErrNoSessionID = errors.New("no session ID found in " + headerAuthorization + " header")

//ErrInvalidScheme is used when the authorization scheme is not supported
var ErrInvalidScheme = errors.New("authorization scheme not supported")

//BeginSession creates a new SessionID, saves the `sessionState` to the store, adds an
//Authorization header to the response with the SessionID, and returns the new SessionID
func BeginSession(signingKey string, store Store, sessionState interface{}, w http.ResponseWriter) (SessionID, error) {
	sessID, err := NewSessionID(signingKey)
	if err != nil {
		return InvalidSessionID, err
	}
	err = store.Save(sessID, sessionState)
	if err != nil {
		return InvalidSessionID, err
	}

	w.Header().Set(headerAuthorization, schemeBearer+string(sessID))

	return sessID, nil
}

//GetSessionID extracts and validates the SessionID from the request headers
func GetSessionID(r *http.Request, signingKey string) (SessionID, error) {
	val := r.Header.Get(headerAuthorization)
	if len(val) == 0 {
		val = r.URL.Query().Get(paramAuthorization)
	}
	if len(val) == 0 {
		return InvalidSessionID, ErrNoSessionID
	}
	if strings.HasPrefix(val, schemeBearer) {
		val = strings.TrimPrefix(val, schemeBearer)
	} else {
		return InvalidSessionID, ErrInvalidScheme
	}

	validID, err := ValidateID(val, signingKey)
	if err != nil {
		return InvalidSessionID, err
	}

	return validID, nil
}

//GetState extracts the SessionID from the request,
//gets the associated state from the provided store into
//the `sessionState` parameter, and returns the SessionID
func GetState(r *http.Request, signingKey string, store Store, sessionState interface{}) (SessionID, error) {
	sessID, err := GetSessionID(r, signingKey)
	if err != nil {
		return InvalidSessionID, err
	}
	err = store.Get(sessID, sessionState)
	if err != nil {
		return InvalidSessionID, err
	}

	return sessID, nil
}

//EndSession extracts the SessionID from the request,
//and deletes the associated data in the provided store, returning
//the extracted SessionID.
func EndSession(r *http.Request, signingKey string, store Store) (SessionID, error) {
	sessID, err := GetSessionID(r, signingKey)
	if err != nil {
		return InvalidSessionID, err
	}
	err = store.Delete(sessID)
	if err != nil {
		return InvalidSessionID, err
	}
	return sessID, nil
}
