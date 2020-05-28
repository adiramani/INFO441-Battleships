package handlers

import (
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/models/users"
	"github.com/INFO441-20sp/assignments-FlaredHeart28/servers/gateway/sessions"
)

// HandlerContext is a struct that holds contextual informatio for the handlers.
type HandlerContext struct {
	SignKey   string
	SessStore sessions.Store
	UserStore users.Store
}
