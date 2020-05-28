package users

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
)

//TODO: add tests for the various functions in user.go, as described in the assignment.
//use `go test -cover` to ensure that you are covering all or nearly all of your code paths.

func TestValidate(t *testing.T) {
	fullUser := &NewUser{
		Email:        "example@example.com",
		Password:     "password",
		PasswordConf: "password",
		UserName:     "UserName",
		FirstName:    "First",
		LastName:     "Last",
	}
	err := fullUser.Validate()
	if err != nil {
		t.Errorf("unexpected error validating user. Got: %v", err)
	}

	fullUser.Email = "e"
	err = fullUser.Validate()
	if err.Error() != "email address not valid" {
		t.Errorf("Expected an error for the email to be invalid. Got: %v", err)
	}
	fullUser.Email = "example@example.com"

	fullUser.Password = "p"
	err = fullUser.Validate()
	if err.Error() != "password must be at least 6 characters" {
		t.Errorf("Expected an error for the password to be invalid. Got: %v", err)
	}
	fullUser.Password = "password"

	fullUser.PasswordConf = "passwords"
	err = fullUser.Validate()
	if err.Error() != "password and confirmation aren't equal" {
		t.Errorf("Expected an error for the password and conf to not match. Got: %v", err)
	}
	fullUser.PasswordConf = "password"

	fullUser.UserName = ""
	err = fullUser.Validate()
	if err.Error() != "username can't be blank" {
		t.Errorf("Expected an error for the username to be blank Got: %v", err)
	}
	fullUser.UserName = "UserName"

	fullUser.UserName = "User Name"
	err = fullUser.Validate()
	if err.Error() != "username can't contain spaces" {
		t.Errorf("Expected an error for the username to not have spaces in it. Got: %v", err)
	}
	fullUser.UserName = "UserName"
}

func TestToUser(t *testing.T) {
	nu := &NewUser{
		Email:        "example@example.com",
		Password:     "password",
		PasswordConf: "password",
		UserName:     "UserName",
		FirstName:    "First",
		LastName:     "Last",
	}
	cU := &User{
		Email:     "example@example.com",
		PassHash:  []byte(""),
		UserName:  "UserName",
		FirstName: "First",
		LastName:  "Last",
		PhotoURL:  "https://www.gravatar.com/avatar/23463b99b62a72f26ed677cc556c44e8",
	}

	u, err := nu.ToUser()
	if err != nil {
		t.Errorf("Unexpeceted error: %v", err)
	}

	if cU.Email != u.Email || cU.UserName != u.UserName || cU.FirstName != u.FirstName || cU.LastName != u.LastName || cU.PhotoURL != u.PhotoURL {
		t.Errorf("User not created correctly. Expeceted: %+v. Got: %+v", cU, u)
	}
	err = bcrypt.CompareHashAndPassword(u.PassHash, []byte("password"))
	if err != nil {
		t.Errorf("User not created correctly. Something wrong with password hash")
	}

	nu2 := &NewUser{
		Email:        " exAmple@exAmplE.com",
		Password:     "password",
		PasswordConf: "password",
		UserName:     "UserName",
		FirstName:    "First",
		LastName:     "Last",
	}

	u2, err := nu2.ToUser()
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}
	if u2.PhotoURL != cU.PhotoURL {
		t.Errorf("PhotoURL does not account for whitespace and/or capital letters. Expected: %s. Got: %s", cU.PhotoURL, u2.PhotoURL)
	}

	badNU := &NewUser{
		Email:        "exAmple@",
		Password:     "password",
		PasswordConf: "password",
		UserName:     "UserName",
		FirstName:    "First",
		LastName:     "Last",
	}

	_, err = badNU.ToUser()
	if err == nil {
		t.Errorf("Expected a validation error, got none.")
	}
}

func TestFullName(t *testing.T) {
	cU := &User{
		Email:    "example@example.com",
		PassHash: []byte(""),
		UserName: "UserName",
		PhotoURL: "https://www.gravatar.com/avatar/23463b99b62a72f26ed677cc556c44e8",
	}

	name := cU.FullName()
	if name != "" {
		t.Errorf("Expected: . Got %s", name)
	}

	cU.FirstName = "First"
	cU.LastName = "Last"
	name = cU.FullName()
	if name != "First Last" {
		t.Errorf("Expected: First Last. Got %s", name)
	}
	cU.FirstName = ""

	name = cU.FullName()
	if name != "Last" {
		t.Errorf("Expected: Last. Got %s", name)

	}
	cU.FirstName = "First"
	cU.LastName = ""

	name = cU.FullName()
	if name != "First" {
		t.Errorf("Expected: First. Got %s", name)
	}
	cU.FirstName = ""

	name = cU.FullName()
	if name != "" {
		t.Errorf("Expected: . Got %s", name)
	}
}

func TestPass(t *testing.T) {
	cU := &User{
		Email:     "example@example.com",
		UserName:  "UserName",
		FirstName: "First",
		LastName:  "Last",
		PhotoURL:  "https://www.gravatar.com/avatar/23463b99b62a72f26ed677cc556c44e8",
	}
	err := cU.SetPassword("password")
	if err != nil {
		t.Errorf("Unexpected Error setting the password: %v", err)
	}

	err = cU.Authenticate("password")
	if err != nil {
		t.Errorf("Expected password to be correct: %v", err)
	}

	err = cU.Authenticate("asdlj")
	if err == nil {
		t.Errorf("Expected a not-authenticated error. Got none")
	}

	err = cU.Authenticate("")
	if err == nil {
		t.Errorf("Expected a not-authenticated error. Got none")
	}
}

func TestApplyUpdates(t *testing.T) {
	cU := &User{
		Email:     "example@example.com",
		UserName:  "UserName",
		FirstName: "First",
		LastName:  "Last",
		PhotoURL:  "https://www.gravatar.com/avatar/23463b99b62a72f26ed677cc556c44e8",
	}

	updates := &Updates{
		FirstName: "First1",
		LastName:  "Last1",
	}
	err := cU.ApplyUpdates(updates)
	if err != nil {
		t.Errorf("Unexpected error applying updates: %v", err)
	}
	if cU.FirstName != "First1" && cU.LastName != "Last1" {
		t.Errorf("Names not updated properly. Expected: %s %s. Got: %s %s", "First1", "Last1", cU.FirstName, cU.LastName)
	}

	updates.FirstName = ""
	updates.LastName = "Last2"
	err = cU.ApplyUpdates(updates)
	if err != nil {
		t.Errorf("Unexpected error applying updates: %v", err)
	}
	if cU.FirstName != "First1" && cU.LastName != "Last2" {
		t.Errorf("Names not updated properly. Expected: %s %s. Got: %s %s", "First1", "Last2", cU.FirstName, cU.LastName)

	}

	updates.FirstName = "First2"
	updates.LastName = ""
	err = cU.ApplyUpdates(updates)
	if err != nil {
		t.Errorf("Unexpected error applying updates: %v", err)
	}
	if cU.FirstName != "First2" && cU.LastName != "Last2" {
		t.Errorf("Names not updated properly. Expected: %s %s. Got: %s, %s", "First2", "Last2", cU.FirstName, cU.LastName)

	}

	updates.FirstName = ""
	updates.LastName = ""
	err = cU.ApplyUpdates(updates)
	if err == nil {
		t.Errorf("Looking for an error when applying updates, didn't get one.")
	}
	if cU.FirstName != "First2" && cU.LastName != "Last2" {
		t.Errorf("Names incorrectly updated. Expected: %s %s. Got: %s, %s", "First2", "Last2", cU.FirstName, cU.LastName)

	}
}
