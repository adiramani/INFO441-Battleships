package users

import (
	"crypto/md5"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

//gravatarBasePhotoURL is the base URL for Gravatar image requests.
//See https://id.gravatar.com/site/implement/images/ for details
const gravatarBasePhotoURL = "https://www.gravatar.com/avatar/"

//bcryptCost is the default bcrypt cost to use when hashing passwords
var bcryptCost = 13

//User represents a user account in the database
type User struct {
	ID        int64  `json:"id"`
	Email     string `json:"-"` //never JSON encoded/decoded
	PassHash  []byte `json:"-"` //never JSON encoded/decoded
	UserName  string `json:"userName"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	PhotoURL  string `json:"photoURL"`
}

//Credentials represents user sign-in credentials
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

//NewUser represents a new user signing up for an account
type NewUser struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	PasswordConf string `json:"passwordConf"`
	UserName     string `json:"userName"`
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
}

//Updates represents allowed updates to a user profile
type Updates struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

//Validate validates the new user and returns an error if
//any of the validation rules fail, or nil if its valid
func (nu *NewUser) Validate() error {
	_, err := mail.ParseAddress(nu.Email)
	if err != nil {
		err = fmt.Errorf("email address not valid")
		return err
	}
	if len(nu.Password) < 6 {
		err = fmt.Errorf("password must be at least 6 characters")
		return err
	}
	if nu.Password != nu.PasswordConf {
		err = fmt.Errorf("password and confirmation aren't equal")
		return err
	}
	if len(nu.UserName) == 0 {
		err = fmt.Errorf("username can't be blank")
		return err
	}
	if strings.Contains(nu.UserName, " ") {
		err = fmt.Errorf("username can't contain spaces")
		return err
	}
	return nil
}

//ToUser converts the NewUser to a User, setting the
//PhotoURL and PassHash fields appropriately
func (nu *NewUser) ToUser() (*User, error) {
	err := nu.Validate()
	if err != nil {
		return nil, err
	}
	user := &User{
		Email:     nu.Email,
		UserName:  nu.UserName,
		FirstName: nu.FirstName,
		LastName:  nu.LastName,
	}

	err = user.SetPassword(nu.Password)
	if err != nil {
		return nil, err
	}

	email := strings.ToLower(strings.TrimSpace(nu.Email))
	hash := md5.Sum([]byte(email))
	user.PhotoURL = fmt.Sprintf("https://www.gravatar.com/avatar/%x", hash)

	return user, nil
}

//FullName returns the user's full name, in the form:
// "<FirstName> <LastName>"
//If either first or last name is an empty string, no
//space is put between the names. If both are missing,
//this returns an empty string
func (u *User) FullName() string {
	name := ""
	if len(u.FirstName) != 0 && len(u.LastName) != 0 {
		name = u.FirstName + " " + u.LastName
	} else if len(u.FirstName) != 0 && len(u.LastName) == 0 {
		name = u.FirstName
	} else if len(u.FirstName) == 0 && len(u.LastName) != 0 {
		name = u.LastName
	}
	return name
}

//SetPassword hashes the password and stores it in the PassHash field
func (u *User) SetPassword(password string) error {
	passHash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return err
	}
	u.PassHash = passHash
	return nil
}

//Authenticate compares the plaintext password against the stored hash
//and returns an error if they don't match, or nil if they do
func (u *User) Authenticate(password string) error {
	err := bcrypt.CompareHashAndPassword(u.PassHash, []byte(password))
	return err
}

//ApplyUpdates applies the updates to the user. An error
//is returned if the updates are invalid
func (u *User) ApplyUpdates(updates *Updates) error {
	if len(updates.FirstName) == 0 && len(updates.LastName) == 0 {
		return errors.New("updates can't be blank")
	} else if len(updates.FirstName) != 0 && len(updates.LastName) == 0 {
		u.FirstName = updates.FirstName
	} else if len(updates.FirstName) == 0 && len(updates.LastName) != 0 {
		u.LastName = updates.LastName
	} else {
		u.FirstName = updates.FirstName
		u.LastName = updates.LastName
	}
	return nil
}
