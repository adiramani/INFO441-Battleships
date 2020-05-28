package users

import (
	"testing"
)

func TestAllTests(t *testing.T) {
	f := &FakeUserStore{}
	user1 := &User{
		ID: 0,
	}
	user2 := &User{
		UserName: "InvalidInsert",
	}

	_, err := f.GetByID(1)
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
	_, err = f.GetByEmail("test@test.com")
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
	_, err = f.GetByUserName("testname")
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
	_, err = f.Insert(user2)
	if err != ErrUserNotFound {
		t.Errorf("Expected an error of ErrUserNotFound, got [%v]", err)
	}
	user3, err := f.Insert(user1)
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
	_, err = f.Insert(user3)
	if err != ErrUserNotFound {
		t.Errorf("Expected an error of ErrUserNotFound, got [%v]", err)
	}
	_, err = f.Update(1, &Updates{})
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
	err = f.Delete(1)
	if err != nil {
		t.Errorf("Expected an error of nil, got [%v]", err)
	}
}
