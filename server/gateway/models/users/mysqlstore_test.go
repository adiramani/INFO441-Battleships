package users

import (
	"errors"
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestGetByID(t *testing.T) {
	cases := []struct {
		name         string
		expectedUser *User
		idToGet      int64
		expectError  int64
	}{
		{
			"User Found",
			&User{
				1,
				"test@test.com",
				[]byte("passhash123"),
				"username",
				"firstname",
				"lastname",
				"photourl",
			},
			1,
			3,
		},
		{
			"User Not Found",
			&User{},
			2,
			1,
		},
		{
			"User With Large ID Found",
			&User{
				1234567890,
				"test@test.com",
				[]byte("passhash123"),
				"username",
				"firstname",
				"lastname",
				"photourl",
			},
			1234567890,
			3,
		},
		{
			"Invalid Row Scan",
			&User{
				1,
				"test@test.com",
				[]byte("passhash123"),
				"username",
				"firstname",
				"lastname",
				"photourl",
			},
			1,
			2,
		},
	}
	for _, c := range cases {
		// Create a new mock database for each case
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := NewMySQLStore(db)

		// Create an expected row to the mock DB
		row := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName",
			"PhotoURL"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
			c.expectedUser.PhotoURL,
		)
		row2 := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
		)

		query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE id=?"
		if c.expectError == 1 {
			// Set up expected query that will expect an error
			mock.ExpectQuery(query).WithArgs(c.idToGet).WillReturnError(ErrUserNotFound)

			// Test GetByID()
			user, err := mainSQLStore.GetByID(c.idToGet)
			if user != nil || err == nil {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else if c.expectError == 2 {
			mock.ExpectQuery(query).WithArgs(c.idToGet).WillReturnRows(row2)

			user, err := mainSQLStore.GetByID(c.idToGet)
			if err == nil || err.Error() != "turning user to struct failed" || user != nil {
				t.Errorf("Expected error [%v] but got [%v] instead", errors.New("turning user to struct failed"), err)
			}
		} else {
			// Set up an expected query with the expected row from the mock DB
			mock.ExpectQuery(query).WithArgs(c.idToGet).WillReturnRows(row)

			// Test GetByID()
			user, err := mainSQLStore.GetByID(c.idToGet)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}
			if !reflect.DeepEqual(user, c.expectedUser) {
				t.Errorf("Error, invalid match in test [%s]", c.name)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestGetByEmail(t *testing.T) {
	cases := []struct {
		name         string
		expectedUser *User
		emailToGet   string
		expectError  int64
	}{
		{
			"User Found",
			&User{
				ID:        0,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			"example@example.com",
			3,
		},
		{
			"Empty User Not Found",
			&User{},
			"example2@example.com",
			1,
		},
		{
			"Invalid Row Scan",
			&User{
				1,
				"example@example.com",
				[]byte("password"),
				"username",
				"firstname",
				"lastname",
				"photourl",
			},
			"example@example.com",
			2,
		},
	}

	for _, c := range cases {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := &MySQLStore{db}

		// Create an expected row to the mock DB
		row := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName",
			"PhotoURL"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
			c.expectedUser.PhotoURL,
		)
		row2 := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
		)

		query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE email=?"
		if c.expectError == 1 {
			mock.ExpectQuery(query).WithArgs(c.emailToGet).WillReturnError(ErrUserNotFound)

			user, err := mainSQLStore.GetByEmail(c.emailToGet)
			if user != nil || err == nil {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else if c.expectError == 2 {
			mock.ExpectQuery(query).WithArgs(c.emailToGet).WillReturnRows(row2)

			user, err := mainSQLStore.GetByEmail(c.emailToGet)
			if err == nil || err.Error() != "turning user to struct failed" || user != nil {
				t.Errorf("Expected error [%v] but got [%v] instead", errors.New("turning user to struct failed"), err)
			}
		} else {
			mock.ExpectQuery(query).WithArgs(c.emailToGet).WillReturnRows(row)

			user, err := mainSQLStore.GetByEmail(c.emailToGet)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}
			if !reflect.DeepEqual(user, c.expectedUser) {
				t.Errorf("Error, invalid match in test [%s]", c.name)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestGetByUserName(t *testing.T) {
	cases := []struct {
		name          string
		expectedUser  *User
		userNameToGet string
		expectError   int64
	}{
		{
			"User Found",
			&User{
				ID:        0,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			"username",
			3,
		},
		{
			"Empty User Not Found",
			&User{},
			"username1",
			1,
		},
		{
			"Username as Number Found",
			&User{
				ID:        0,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "123",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			"123",
			3,
		},
		{
			"Invalid Row Scan",
			&User{
				1,
				"example@example.com",
				[]byte("password"),
				"username",
				"firstname",
				"lastname",
				"photourl",
			},
			"username",
			2,
		},
	}

	for _, c := range cases {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := &MySQLStore{db}

		// Create an expected row to the mock DB
		row := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName",
			"PhotoURL"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
			c.expectedUser.PhotoURL,
		)

		row2 := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
		)

		query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE username=?"
		if c.expectError == 1 {
			mock.ExpectQuery(query).WithArgs(c.userNameToGet).WillReturnError(ErrUserNotFound)

			user, err := mainSQLStore.GetByUserName(c.userNameToGet)
			if user != nil || err == nil {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else if c.expectError == 2 {
			mock.ExpectQuery(query).WithArgs(c.userNameToGet).WillReturnRows(row2)

			user, err := mainSQLStore.GetByUserName(c.userNameToGet)
			if err == nil || err.Error() != "turning user to struct failed" || user != nil {
				t.Errorf("Expected error [%v] but got [%v] instead", errors.New("turning user to struct failed"), err)
			}
		} else {
			mock.ExpectQuery(query).WithArgs(c.userNameToGet).WillReturnRows(row)

			user, err := mainSQLStore.GetByUserName(c.userNameToGet)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}
			if !reflect.DeepEqual(user, c.expectedUser) {
				t.Errorf("Error, invalid match in test [%s]", c.name)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestInsert(t *testing.T) {
	cases := []struct {
		name         string
		expectedUser *User
		expectError  bool
	}{
		{
			"User Inserted",
			&User{
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			false,
		},
		{
			"User Not Inserted No Email",
			&User{
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			true,
		},
		{
			"User Not Inserted No Password",
			&User{
				Email:     "example@example.com",
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			true,
		},
		{
			"User Not Inserted No Username",
			&User{
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			true,
		},
	}

	for _, c := range cases {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := &MySQLStore{db}

		exec := "INSERT INTO user (email, username, firstname, lastname, photourl, passhash) VALUES (?,?,?,?,?,?)"
		if c.expectError {
			mock.ExpectExec(exec).WithArgs(c.expectedUser.Email, c.expectedUser.UserName, c.expectedUser.FirstName, c.expectedUser.LastName, c.expectedUser.PhotoURL, c.expectedUser.PassHash).WillReturnError(ErrUserNotFound)

			user, err := mainSQLStore.Insert(c.expectedUser)
			if user != nil || err == nil {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else {
			mock.ExpectExec(exec).WithArgs(c.expectedUser.Email, c.expectedUser.UserName, c.expectedUser.FirstName, c.expectedUser.LastName, c.expectedUser.PhotoURL, c.expectedUser.PassHash).WillReturnResult(sqlmock.NewResult(1, 1))

			user, err := mainSQLStore.Insert(c.expectedUser)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}
			if !reflect.DeepEqual(user, c.expectedUser) {
				t.Errorf("Error, invalid match in test [%s]", c.name)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestUpdate(t *testing.T) {
	cases := []struct {
		name         string
		expectedUser *User
		updates      *Updates
		insertUser   *User
		expectError  int64
	}{
		{
			"User Updated Both Names",
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "first1",
				LastName:  "last1",
				PhotoURL:  "photourl",
			},
			&Updates{
				FirstName: "first1",
				LastName:  "last1",
			},
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			3,
		},
		{
			"User Updated Last Name",
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "last2",
				PhotoURL:  "photourl",
			},
			&Updates{
				LastName: "last2",
			},
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			3,
		},
		{
			"User Updated First Name",
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "first1",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			&Updates{
				FirstName: "first1",
			},
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			3,
		},
		{
			"User Not Updated, Blank Updates",
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			&Updates{},
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			1,
		},
		{
			"User Not Updated, Invalid UserID",
			&User{
				ID:        1,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			&Updates{
				FirstName: "first1",
				LastName:  "last1",
			},
			&User{
				ID:        3,
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			2,
		},
	}

	for _, c := range cases {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := &MySQLStore{db}

		row := mock.NewRows([]string{
			"ID",
			"Email",
			"PassHash",
			"UserName",
			"FirstName",
			"LastName",
			"PhotoURL"},
		).AddRow(
			c.expectedUser.ID,
			c.expectedUser.Email,
			c.expectedUser.PassHash,
			c.expectedUser.UserName,
			c.expectedUser.FirstName,
			c.expectedUser.LastName,
			c.expectedUser.PhotoURL,
		)

		exec := "UPDATE user SET firstname=?, lastname=? WHERE id=?"
		query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE id=?"
		if c.expectError == 1 {
			mock.ExpectQuery(query).WithArgs(c.insertUser.ID).WillReturnRows(row)

			user, err := mainSQLStore.Update(c.insertUser.ID, c.updates)
			if user != nil || err.Error() != "updates can't be blank" {
				t.Errorf("Expected error [%v] but got [%v] instead", errors.New("updates can't be blank"), err)
			}
		} else if c.expectError == 2 {
			mock.ExpectQuery(query).WithArgs(c.insertUser.ID).WillReturnError(ErrUserNotFound)

			user, err := mainSQLStore.Update(c.insertUser.ID, c.updates)
			if user != nil || err != ErrUserNotFound {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else {
			mock.ExpectQuery(query).WithArgs(c.insertUser.ID).WillReturnRows(row)
			if len(c.updates.LastName) == 0 {
				mock.ExpectExec(exec).WithArgs(c.updates.FirstName, c.insertUser.LastName, c.insertUser.ID).WillReturnResult(sqlmock.NewResult(1, 1))
			} else if len(c.updates.FirstName) == 0 {
				mock.ExpectExec(exec).WithArgs(c.insertUser.FirstName, c.updates.LastName, c.insertUser.ID).WillReturnResult(sqlmock.NewResult(1, 1))
			} else {
				mock.ExpectExec(exec).WithArgs(c.updates.FirstName, c.updates.LastName, c.insertUser.ID).WillReturnResult(sqlmock.NewResult(1, 1))
			}

			user, err := mainSQLStore.Update(c.insertUser.ID, c.updates)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}
			if !reflect.DeepEqual(user, c.expectedUser) {
				t.Errorf("Error, invalid match in test [%s]", c.name)
			}
		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}

func TestDelete(t *testing.T) {
	cases := []struct {
		name        string
		deleteUser  *User
		deleteID    int64
		expectError bool
	}{
		{
			"Successful Delete",
			&User{
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			1,
			false,
		},
		{
			"Failed Delete Invalid ID",
			&User{
				Email:     "example@example.com",
				PassHash:  []byte("password"),
				UserName:  "username",
				FirstName: "firstname",
				LastName:  "lastname",
				PhotoURL:  "photourl",
			},
			100000,
			true,
		},
	}

	for _, c := range cases {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		if err != nil {
			t.Fatalf("There was a problem opening a database connection: [%v]", err)
		}
		defer db.Close()

		mainSQLStore := &MySQLStore{db}

		exec := "DELETE FROM user WHERE id=?"
		query := "SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE id=?"
		if c.expectError {
			mock.ExpectExec(exec).WithArgs(c.deleteID).WillReturnError(ErrUserNotFound)

			err := mainSQLStore.Delete(c.deleteID)
			if err == nil {
				t.Errorf("Expected error [%v] but got [%v] instead", ErrUserNotFound, err)
			}
		} else {
			mock.ExpectExec(exec).WithArgs(c.deleteID).WillReturnResult(sqlmock.NewResult(1, 1))
			mock.ExpectQuery(query).WithArgs(c.deleteID).WillReturnError(ErrUserNotFound)

			err := mainSQLStore.Delete(c.deleteID)
			if err != nil {
				t.Errorf("Unexpected error on successful test [%s]: %v", c.name, err)
			}

			user, err := mainSQLStore.GetByID(c.deleteID)
			if user != nil || err == nil {
				t.Errorf("Found a user when it should have been deleted.")
			}

		}

		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("There were unfulfilled expectations: %s", err)
		}
	}
}
