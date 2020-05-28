package handlers

import (
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"time"
)

// SessionState is a struct that holds info for a state
type SessionState struct {
	StartTime time.Time  `json:"startTime"`
	User      users.User `json:"user"`
}
