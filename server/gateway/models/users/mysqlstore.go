package users

import (
	"database/sql"
	"errors"
)

// MySQLStore is a struct that contains a database pointer to query on for the rest of the function
type MySQLStore struct {
	Database *sql.DB
}

// NewMySQLStore creates a new MySQLStore struct with a passed in sql database pointed
func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{
		Database: db,
	}
}

// GetByID returns a user from the user table based on the passed in id. Returns an error if a user cannot be found
func (ms *MySQLStore) GetByID(id int64) (*User, error) {
	user := &User{}
	userRow, err := ms.Database.Query("SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE id=?", id)
	if err != nil || !userRow.Next() {
		return nil, ErrUserNotFound
	}
	err = userRow.Scan(&user.ID, &user.Email, &user.PassHash, &user.UserName, &user.FirstName, &user.LastName, &user.PhotoURL)
	if err != nil {
		return nil, errors.New("turning user to struct failed")
	}
	return user, nil
}

// GetByEmail returns a user from the user table based on the passed in email. Returns an error if a user cannot be found
func (ms *MySQLStore) GetByEmail(email string) (*User, error) {
	user := &User{}
	userRow, err := ms.Database.Query("SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE email=?", email)
	if err != nil || !userRow.Next() {
		return nil, ErrUserNotFound
	}
	err = userRow.Scan(&user.ID, &user.Email, &user.PassHash, &user.UserName, &user.FirstName, &user.LastName, &user.PhotoURL)
	if err != nil {
		return nil, errors.New("turning user to struct failed")
	}
	return user, nil
}

// GetByUserName returns a user from the user table based on the passed in username. Returns an error if a user cannot be found
func (ms *MySQLStore) GetByUserName(username string) (*User, error) {
	user := &User{}
	userRow, err := ms.Database.Query("SELECT id, email, passhash, username, firstname, lastname, photourl FROM user WHERE username=?", username)
	if err != nil || !userRow.Next() {
		return nil, ErrUserNotFound
	}
	defer userRow.Close()
	err = userRow.Scan(&user.ID, &user.Email, &user.PassHash, &user.UserName, &user.FirstName, &user.LastName, &user.PhotoURL)
	if err != nil {
		return nil, errors.New("turning user to struct failed")
	}
	return user, nil
}

// Insert insters a user into the database. Returns an error if one arises, otherwise returns the new user object which now contains and ID
func (ms *MySQLStore) Insert(user *User) (*User, error) {
	ins := "INSERT INTO user (email, username, firstname, lastname, photourl, passhash) VALUES (?,?,?,?,?,?)"
	userID, err := ms.Database.Exec(ins, user.Email, user.UserName, user.FirstName, user.LastName, user.PhotoURL, user.PassHash)
	if err != nil {
		return nil, err
	}
	user.ID, err = userID.LastInsertId()
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// Update updates the user given by the id and based on the updates provided. Returns the new user if executed correctly, otherwise returns an error.
func (ms *MySQLStore) Update(id int64, updates *Updates) (*User, error) {
	user, err := ms.GetByID(id)
	if err != nil {
		return nil, err
	}
	err = user.ApplyUpdates(updates)
	if err != nil {
		return nil, err
	}
	upd := "UPDATE user SET firstname=?, lastname=? WHERE id=?"
	_, err = ms.Database.Exec(upd, user.FirstName, user.LastName, id)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// Delete deletes a user from the database based on the id. Returns an error if one occurs.
func (ms *MySQLStore) Delete(id int64) error {
	del := "DELETE FROM user WHERE id=?"
	_, err := ms.Database.Exec(del, id)
	if err != nil {
		return ErrUserNotFound
	}
	return nil
}
