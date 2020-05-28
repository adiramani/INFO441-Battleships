package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServeHTTP(t *testing.T) {
	cases := []struct {
		name      string
		method    string
		path      string
		respCode  int
		expectErr bool
	}{
		{
			"Method: OPTIONS",
			"OPTIONS",
			"/test/cors",
			http.StatusOK,
			false,
		},
		{
			"METHOD: POST",
			"POST",
			"/test/cors",
			http.StatusOK,
			false,
		},
		{
			"METHOD: POST",
			"POST",
			"/v1/sessions",
			http.StatusUnsupportedMediaType,
			true,
		},
		{
			"METHOD: POST",
			"POST",
			"/v1/sessions",
			http.StatusBadRequest,
			true,
		},
	}
	for _, c := range cases {
		fakeJSON := ""
		if c.respCode == http.StatusBadRequest {
			fakeJSON = "{fake:fake}"
		}
		req, err := http.NewRequest(c.method, c.path, strings.NewReader(fakeJSON))
		if err != nil {
			t.Fatal(err)
		}

		if c.respCode == http.StatusBadRequest {
			req.Header.Set("Content-Type", "application/json")
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if w.Header().Get("Access-Control-Allow-Origin") != "*" || w.Header().Get("Access-Control-Allow-Methods") != "GET, PUT, POST, PATCH, DELETE" || w.Header().Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" || w.Header().Get("Access-Control-Expose-Headers") != "Authorization" || w.Header().Get("Access-Control-Max-Age") != "600" {
				http.Error(w, "Not all CORS Headers set", http.StatusInternalServerError)
				return
			}
			w.Write([]byte("All CORS Headers Set"))
		})

		cors := &CORS{handler}
		cors.ServeHTTP(rr, req)
		if c.method == "OPTIONS" {
			if rr.Code != c.respCode {
				t.Errorf("Expected status [%v] but got [%v]", c.respCode, rr.Code)
			}
		} else {
			if c.method == "POST" && c.expectErr {
				if rr.Code != c.respCode {
					t.Errorf("Expected error code [%v] got [%v] instead", c.respCode, rr.Code)
				}
			} else {
				if rr.Body.String() != "All CORS Headers Set" {
					t.Errorf("%s: Expected response [%s] got [%s] instead. Headers: %+v", c.name, "All CORS Headers Set", rr.Body.String(), rr.Header())
				}
			}
		}
	}
}
