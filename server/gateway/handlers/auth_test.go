package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/sessions"
	"github.com/go-redis/redis"
	"golang.org/x/crypto/bcrypt"
)

func TestUsersHandler(t *testing.T) {
	cases := []struct {
		name         string
		method       string
		newUser      *users.NewUser
		fullUser     *users.User
		expectedCode int
		contentType  string
		expectError  bool
	}{
		{
			"Wrong Method Fail",
			"GET",
			&users.NewUser{},
			&users.User{},
			http.StatusMethodNotAllowed,
			"application/json",
			true,
		},
		{
			"Wrong Content Type Fail",
			"POST",
			&users.NewUser{},
			&users.User{},
			http.StatusUnsupportedMediaType,
			"text",
			true,
		},
		{
			"Invalid User Fail",
			"POST",
			&users.NewUser{},
			&users.User{},
			http.StatusBadRequest,
			"application/json",
			true,
		},
		{
			"Failed to Insert",
			"POST",
			&users.NewUser{
				Email:        "test@test.com",
				Password:     "password",
				PasswordConf: "password",
				UserName:     "InvalidInsert",
				FirstName:    "first",
				LastName:     "last",
			},
			&users.User{},
			http.StatusInternalServerError,
			"application/json",
			true,
		},
		{
			"Succcess",
			"POST",
			&users.NewUser{
				Email:        "test@test.com",
				Password:     "password",
				PasswordConf: "password",
				UserName:     "username",
				FirstName:    "first",
				LastName:     "last",
			},
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "first",
				LastName:  "last",
				PhotoURL:  "photourl",
			},
			http.StatusCreated,
			"application/json",
			false,
		},
	}
	for _, c := range cases {
		key := "key"
		redisaddr := os.Getenv("REDISADDR")
		if len(redisaddr) == 0 {
			redisaddr = "127.0.0.1:6379"
		}
		client := redis.NewClient(&redis.Options{
			Addr: redisaddr,
		})
		redisStore := sessions.NewRedisStore(client, time.Hour)
		fakeSQLStore := &users.FakeUserStore{}
		handlerContext := &HandlerContext{
			SignKey:   key,
			SessStore: redisStore,
			UserStore: fakeSQLStore,
		}

		jsonString, err := json.Marshal(c.newUser)
		if err != nil {
			t.Fatal("Unable to Marshal newUser")
		}

		req, err := http.NewRequest(c.method, "v1/users", strings.NewReader(string(jsonString)))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(handlerContext.UsersHandler)

		if c.expectError {
			req.Header.Set("Content-Type", c.contentType)
			handler.ServeHTTP(rr, req)

			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]", c.name, c.expectedCode, status)
			}
		} else {
			req.Header.Set("Content-Type", c.contentType)
			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("Expected a status code of [%d] got [%d]", c.expectedCode, status)
			}
			if rr.Header().Get("Content-Type") != "application/json" {
				t.Errorf("Expected a content type of [%s] got [%s]", "application/json", rr.Header().Get("Content-Type"))
			}
			user := &users.User{}
			err := json.Unmarshal([]byte(rr.Body.String()), user)
			if err != nil || len(user.Email) != 0 || len(user.PassHash) != 0 {
				t.Errorf("Expected to find user in body without email and password")
			}
		}
	}
}

func TestSpecficUserHandler(t *testing.T) {
	cases := []struct {
		name         string
		method       string
		fullUser     *users.User
		update       *users.Updates
		expectedCode int
		contentType  string
		path         string
		setAuth      bool
		expectError  int
	}{
		{
			"Incorrect Method",
			"POST",
			&users.User{},
			&users.Updates{},
			http.StatusMethodNotAllowed,
			"application/json",
			"123",
			true,
			0,
		},
		{
			"Not Authorized Session",
			"POST",
			&users.User{},
			&users.Updates{},
			http.StatusUnauthorized,
			"application/json",
			"123",
			false,
			0,
		},
		{
			"Unable to Get User",
			"GET",
			&users.User{
				ID: 123,
			},
			&users.Updates{},
			http.StatusNotFound,
			"application/json",
			"123",
			true,
			1,
		},
		{
			"UnAuthorized User PATCH",
			"PATCH",
			&users.User{
				ID: 100,
			},
			&users.Updates{},
			http.StatusForbidden,
			"application/json",
			"123",
			true,
			2,
		},
		{
			"No JSON Header PATCH",
			"PATCH",
			&users.User{
				ID: 123,
			},
			&users.Updates{},
			http.StatusUnsupportedMediaType,
			"text",
			"123",
			true,
			2,
		},
		{
			"Bad Update Body PATCH",
			"PATCH",
			&users.User{
				ID: 123,
			},
			&users.Updates{},
			http.StatusBadRequest,
			"application/json",
			"123",
			true,
			2,
		},
		{
			"Invalid Update PATCH",
			"PATCH",
			&users.User{
				ID: 123,
			},
			&users.Updates{
				FirstName: "First",
			},
			http.StatusInternalServerError,
			"application/json",
			"123",
			true,
			2,
		},
		{
			"Correct Update PATCH ID",
			"PATCH",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Updates{
				FirstName: "First",
				LastName:  "Last",
			},
			http.StatusOK,
			"application/json",
			"1",
			true,
			3,
		},
		{
			"Correct Update PATCH ME",
			"PATCH",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Updates{
				FirstName: "First",
				LastName:  "Last",
			},
			http.StatusOK,
			"application/json",
			"me",
			true,
			3,
		},
		{
			"Correct GET",
			"GET",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Updates{},
			http.StatusOK,
			"application/json",
			"1",
			true,
			3,
		},
		{
			"Correct GET",
			"GET",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Updates{},
			http.StatusOK,
			"application/json",
			"me",
			true,
			3,
		},
	}
	for _, c := range cases {
		key := "key"
		_, err := sessions.NewSessionID(key)
		if err != nil {
			t.Fatalf("error generating SessionID: %v", err)
		}
		redisaddr := os.Getenv("REDISADDR")
		if len(redisaddr) == 0 {
			redisaddr = "127.0.0.1:6379"
		}
		client := redis.NewClient(&redis.Options{
			Addr: redisaddr,
		})
		redisStore := sessions.NewRedisStore(client, time.Hour)

		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()
		mainSQLStore := users.NewMySQLStore(db)

		handlerContext := &HandlerContext{
			SignKey:   key,
			SessStore: redisStore,
			UserStore: mainSQLStore,
		}

		path := "v1/users/" + c.path
		updateJSON := []byte("{right:wrong}")

		if len(c.update.FirstName) != 0 || len(c.update.LastName) != 0 {
			updateJSON, err = json.Marshal(c.update)
			if err != nil {
				t.Fatal("Unable to Marshal updates")
			}
		}

		req, err := http.NewRequest(c.method, path, strings.NewReader(string(updateJSON)))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(handlerContext.SpecficUserHandler)

		sessState := &SessionState{
			StartTime: time.Now(),
			User:      *c.fullUser,
		}
		sessID, err := sessions.BeginSession(handlerContext.SignKey, handlerContext.SessStore, sessState, rr)
		if err != nil {
			t.Fatal("Problem creating session: " + err.Error())
		}
		req.Header.Set("Content-Type", c.contentType)
		if c.setAuth {
			req.Header.Set("Authorization", "Bearer "+string(sessID))
		}

		if c.expectError == 0 {
			handler.ServeHTTP(rr, req)

			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else if c.expectError == 1 {
			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else if c.expectError == 2 {
			sessState.User = *c.fullUser
			err = handlerContext.SessStore.Save(sessID, sessState)
			if err != nil {
				t.Fatal("Unable to save session")
			}

			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else if c.expectError == 3 {
			sessState.User = *c.fullUser
			err = handlerContext.SessStore.Save(sessID, sessState)
			if err != nil {
				t.Fatal("Unable to save session")
			}
			row := mock.NewRows([]string{
				"ID",
				"Email",
				"PassHash",
				"UserName",
				"FirstName",
				"LastName",
				"PhotoURL"},
			).AddRow(
				c.fullUser.ID,
				c.fullUser.Email,
				c.fullUser.PassHash,
				c.fullUser.UserName,
				c.fullUser.FirstName,
				c.fullUser.LastName,
				c.fullUser.PhotoURL,
			)

			exec := "UPDATE user SET firstname=?, lastname=? WHERE id=?"
			query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE id=?"
			mock.ExpectQuery(query).WithArgs(c.fullUser.ID).WillReturnRows(row)
			if c.method == "PATCH" {
				mock.ExpectExec(exec).WithArgs(c.update.FirstName, c.update.LastName, c.fullUser.ID).WillReturnResult(sqlmock.NewResult(1, 1))
			}
			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
			if rr.Header().Get("Content-Type") != "application/json" {
				t.Errorf("Expected a content type of [%s] got [%s]", "application/json", rr.Header().Get("Content-Type"))
			}
			user := &users.User{}
			err := json.Unmarshal([]byte(rr.Body.String()), user)
			expectFirst := c.fullUser.FirstName
			expectLast := c.fullUser.LastName
			if len(c.update.FirstName) != 0 {
				expectFirst = c.update.FirstName
			}
			if len(c.update.LastName) != 0 {
				expectLast = c.update.LastName
			}

			if err != nil || len(user.Email) != 0 || len(user.PassHash) != 0 || (user.LastName != expectLast || user.FirstName != expectFirst) {
				t.Errorf("Expected to find user in body without email and password, or with updated names.")
			}

		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestSessionsHandler(t *testing.T) {
	cases := []struct {
		name         string
		method       string
		fullUser     *users.User
		credentials  *users.Credentials
		expectedCode int
		contentType  string
		expectError  int
	}{
		{
			"Wrong Method Type",
			"GET",
			&users.User{},
			&users.Credentials{},
			http.StatusMethodNotAllowed,
			"application/json",
			0,
		},
		{
			"Wrong Content-Type",
			"POST",
			&users.User{},
			&users.Credentials{},
			http.StatusUnsupportedMediaType,
			"text",
			0,
		},
		{
			"Unsupported Credential Body",
			"POST",
			&users.User{},
			&users.Credentials{},
			http.StatusBadRequest,
			"application/json",
			0,
		},
		{
			"User Not Found With Email",
			"POST",
			&users.User{},
			&users.Credentials{
				Email: "test@test.com",
			},
			http.StatusUnauthorized,
			"application/json",
			0,
		},
		{
			"Password Doesn't Match",
			"POST",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Credentials{
				Email:    "test@test.com",
				Password: "passwerd",
			},
			http.StatusUnauthorized,
			"application/json",
			1,
		},
		{
			"Success",
			"POST",
			&users.User{
				ID:        1,
				Email:     "test@test.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "FirstName",
				LastName:  "LastName",
				PhotoURL:  "photourl",
			},
			&users.Credentials{
				Email:    "test@test.com",
				Password: "password",
			},
			http.StatusCreated,
			"application/json",
			2,
		},
	}
	for _, c := range cases {
		key := "key"
		_, err := sessions.NewSessionID(key)
		if err != nil {
			t.Fatalf("error generating SessionID: %v", err)
		}
		redisaddr := os.Getenv("REDISADDR")
		if len(redisaddr) == 0 {
			redisaddr = "127.0.0.1:6379"
		}
		client := redis.NewClient(&redis.Options{
			Addr: redisaddr,
		})
		redisStore := sessions.NewRedisStore(client, time.Hour)

		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()
		mainSQLStore := users.NewMySQLStore(db)

		handlerContext := &HandlerContext{
			SignKey:   key,
			SessStore: redisStore,
			UserStore: mainSQLStore,
		}

		path := "v1/sessions"
		credJSON := []byte("{randomcreds:rand}")
		if len(c.credentials.Email) != 0 || len(c.credentials.Password) != 0 {
			credJSON, err = json.Marshal(c.credentials)
			if err != nil {
				t.Fatal("Unable to Marshal updates")
			}
		}

		req, err := http.NewRequest(c.method, path, strings.NewReader(string(credJSON)))
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(handlerContext.SessionsHandler)

		req.Header.Set("Content-Type", c.contentType)
		if c.expectError == 0 {
			handler.ServeHTTP(rr, req)

			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else if c.expectError == 1 {
			row := mock.NewRows([]string{
				"ID",
				"Email",
				"PassHash",
				"UserName",
				"FirstName",
				"LastName",
				"PhotoURL"},
			).AddRow(
				c.fullUser.ID,
				c.fullUser.Email,
				c.fullUser.PassHash,
				c.fullUser.UserName,
				c.fullUser.FirstName,
				c.fullUser.LastName,
				c.fullUser.PhotoURL,
			)
			query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE email=?"
			mock.ExpectQuery(query).WithArgs(c.fullUser.Email).WillReturnRows(row)

			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else {
			pass := c.fullUser.PassHash
			c.fullUser.PassHash, err = bcrypt.GenerateFromPassword(pass, 13)
			if err != nil {
				t.Fatal("Unable to create hash")
			}
			row := mock.NewRows([]string{
				"ID",
				"Email",
				"PassHash",
				"UserName",
				"FirstName",
				"LastName",
				"PhotoURL"},
			).AddRow(
				c.fullUser.ID,
				c.fullUser.Email,
				c.fullUser.PassHash,
				c.fullUser.UserName,
				c.fullUser.FirstName,
				c.fullUser.LastName,
				c.fullUser.PhotoURL,
			)
			query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE email=?"
			mock.ExpectQuery(query).WithArgs(c.fullUser.Email).WillReturnRows(row)

			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
			if rr.Header().Get("Content-Type") != "application/json" {
				t.Errorf("Expected a content type of [%s] got [%s]", "application/json", rr.Header().Get("Content-Type"))
			}
			user := &users.User{}
			err := json.Unmarshal([]byte(rr.Body.String()), user)
			if err != nil || len(user.Email) != 0 || len(user.PassHash) != 0 {
				t.Errorf("Expected to find user in body without email and password, or with updated names.")
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestSpecificSessionHandler(t *testing.T) {
	cases := []struct {
		name         string
		method       string
		fullUser     *users.User
		expectedCode int
		path         string
		fakeSess     bool
		expectError  int
	}{
		{
			"Wrong Method Type",
			"GET",
			&users.User{},
			http.StatusMethodNotAllowed,
			"mine",
			false,
			0,
		},
		{
			"Wrong Path",
			"DELETE",
			&users.User{},
			http.StatusForbidden,
			"min",
			false,
			0,
		},
		{
			"Can't Delete Session",
			"DELETE",
			&users.User{},
			http.StatusInternalServerError,
			"mine",
			true,
			0,
		},
		{
			"Success Delete Session",
			"DELETE",
			&users.User{},
			http.StatusMethodNotAllowed,
			"mine",
			false,
			2,
		},
	}
	for _, c := range cases {
		key := "key"
		_, err := sessions.NewSessionID(key)
		if err != nil {
			t.Fatalf("error generating SessionID: %v", err)
		}
		redisaddr := os.Getenv("REDISADDR")
		if len(redisaddr) == 0 {
			redisaddr = "127.0.0.1:6379"
		}
		client := redis.NewClient(&redis.Options{
			Addr: redisaddr,
		})
		redisStore := sessions.NewRedisStore(client, time.Hour)

		fakeSQLStore := &users.FakeUserStore{}
		handlerContext := &HandlerContext{
			SignKey:   key,
			SessStore: redisStore,
			UserStore: fakeSQLStore,
		}

		path := "v1/sessions/" + c.path

		req, err := http.NewRequest(c.method, path, nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(handlerContext.SpecificSessionHandler)

		if c.expectError == 0 {
			sessState := &SessionState{}
			sessID, err := sessions.BeginSession(handlerContext.SignKey, handlerContext.SessStore, sessState, rr)
			if err != nil {
				t.Fatal("Unable to begin session")
			}
			if c.fakeSess {
				sessID, err = sessions.NewSessionID("Koy")
				if err != nil {
					t.Fatal("Error generating fake session ID")
				}
			}
			req.Header.Set("Authorization", "Bearer "+string(sessID))

			handler.ServeHTTP(rr, req)
			status := rr.Code
			if status != c.expectedCode {
				t.Errorf("%s: Expected a status code of [%d] got [%d]. Error: %s", c.name, c.expectedCode, status, rr.Body.String())
			}
		} else {
			sessState := &SessionState{}
			sessID, err := sessions.BeginSession(handlerContext.SignKey, handlerContext.SessStore, sessState, rr)
			if err != nil {
				t.Fatal("Unable to begin session")
			}
			req.Header.Set("Authorization", "Bearer "+string(sessID))

			handler.ServeHTTP(rr, req)
			if rr.Body.String() != "Signed out" {
				t.Errorf("%s: Expected a response of [%s] got [%s].", c.name, "Signed Out", rr.Body.String())
			}
		}
	}
}
