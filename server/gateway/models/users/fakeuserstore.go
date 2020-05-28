package users

// FakeUserStore is a struct for the fake user store
type FakeUserStore struct {
}

//GetByID returns the User with the given ID
func (f *FakeUserStore) GetByID(id int64) (*User, error) {
	return nil, nil
}

//GetByEmail returns the User with the given email
func (f *FakeUserStore) GetByEmail(email string) (*User, error) {
	return nil, nil

}

//GetByUserName returns the User with the given Username
func (f *FakeUserStore) GetByUserName(username string) (*User, error) {
	return nil, nil

}

//Insert inserts the user into the database, and returns
//the newly-inserted User, complete with the DBMS-assigned ID
func (f *FakeUserStore) Insert(user *User) (*User, error) {
	if user.UserName == "InvalidInsert" {
		return nil, ErrUserNotFound
	} else if user.ID == 0 {
		user.ID = 1
		return user, nil
	}
	return nil, ErrUserNotFound
}

//Update applies UserUpdates to the given user ID
//and returns the newly-updated user
func (f *FakeUserStore) Update(id int64, updates *Updates) (*User, error) {
	return nil, nil
}

//Delete deletes the user with the given ID
func (f *FakeUserStore) Delete(id int64) error {
	return nil
}
