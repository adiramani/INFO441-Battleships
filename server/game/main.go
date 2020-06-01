package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

var mx sync.Mutex

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type connectedUser struct {
	connection           *websocket.Conn
	opponentID           int
	gameID               int
	pieceLocations       [][]bool
	guessLocations       [][]bool
	turn                 bool
	pieceLocationsLoaded bool
}

// contains all users currently playing the game
var connectedUsers map[int]*connectedUser

// startGameHandler stores information about a user
func startGameHandler(w http.ResponseWriter, r *http.Request) {
	user := &connectedUser{}
	userID, err := strconv.Atoi(r.Header.Get("userID"))
	gameID, err2 := strconv.Atoi(r.Header.Get("gameID"))
	if err != nil || err2 != nil {
		http.Error(w, "userID and gameID are not integers", 400)
		return
	}
	user.gameID = gameID
	user.opponentID = -1
	user.turn = false

	pieceLocations := make([][]bool, 8)
	for i := range pieceLocations {
		pieceLocations[i] = make([]bool, 8)
	}
	user.pieceLocations = pieceLocations

	guessLocations := make([][]bool, 8)
	for i := range guessLocations {
		guessLocations[i] = make([]bool, 8)
	}
	user.guessLocations = guessLocations

	mx.Lock()
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Connection error", 500)
		return
	}
	user.connection = conn
	// if both players for a game are connected, we can start the game
	for key := range connectedUsers {
		if connectedUsers[key].gameID == user.gameID {
			user.opponentID = key
			opponent := connectedUsers[key]
			opponent.opponentID = userID
			opponent.turn = true // might need to reinsert into hashmap?
			user.connection.WriteMessage(1, []byte("Display board"))
			opponent.connection.WriteMessage(1, []byte("Display board"))
		}
	}
	connectedUsers[userID] = user
	mx.Unlock()
}

// boardLayoutHandler stores a user's board layout (positions of their pieces)
func boardLayoutHandler(w http.ResponseWriter, r *http.Request) {
	// body could be made by scanning through the board when user presses ready and adding locations with pieces to a string
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "An error occurred when reading the request body", 400)
		return
	}
	// pieceLocations is a comma seperated list of x, y values representing a user's board layout
	pieceLocations := strings.Split(string(body), (","))

	userID, _ := strconv.Atoi(r.Header.Get("userID"))
	mx.Lock()
	user := connectedUsers[userID]
	opponent := connectedUsers[user.opponentID]
	for i := 0; i < 34; i += 2 {
		x, _ := strconv.Atoi(pieceLocations[i])
		y, _ := strconv.Atoi(pieceLocations[i+1])
		user.pieceLocations[x][y] = true
	}
	if opponent.pieceLocationsLoaded {
		user.connection.WriteMessage(1, []byte("Start game"))
		opponent.connection.WriteMessage(1, []byte("Start game"))
		return
	}
	user.pieceLocationsLoaded = true
	mx.Unlock()
}

// moveHandler handles moves by players
func moveHandler(w http.ResponseWriter, r *http.Request) {
	userID, _ := strconv.Atoi(r.Header.Get("userID"))
	// body consists of a row, col which are the hit for where the user wants to guess.
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "An error occurred when reading the request body", 400)
		return
	}
	x, _ := strconv.Atoi(strings.Split(string(body), (","))[0])
	y, _ := strconv.Atoi(strings.Split(string(body), (","))[1])

	mx.Lock()
	user := connectedUsers[userID]
	opponent := connectedUsers[user.opponentID]

	user.guessLocations[x][y] = true
	if gameOver(user.guessLocations, opponent.pieceLocations) {
		user.connection.WriteMessage(1, []byte("You won!"))
		opponent.connection.WriteMessage(1, []byte("You lost :("))
		delete(connectedUsers, userID)
		delete(connectedUsers, user.opponentID)
		mx.Unlock()
		// communicate with api so that the game microservice can reuse the game id later?
		return
	}
	user.turn = false
	opponent.turn = true
	// returns the coordinate in "x,y" format of the user's move.
	user.connection.WriteMessage(1, []byte(strconv.Itoa(x)+","+strconv.Itoa(y)))
	opponent.connection.WriteMessage(1, []byte(strconv.Itoa(x)+","+strconv.Itoa(y)))
	mx.Unlock()
}

// Returns a boolean indicating whether or not the current game is over
func gameOver(guessLocations [][]bool, pieceLocations [][]bool) bool {
	hitCount := 0
	for i := range guessLocations {
		for j := range guessLocations[i] {
			if guessLocations[i][j] && pieceLocations[i][j] {
				hitCount++
			}
		}
	}
	return hitCount == 17 // total number of squares that ships occupy
}

func main() {
	addr := os.Getenv("ADDR")
	if len(addr) == 0 {
		addr = ":4000"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/game/start", startGameHandler)
	mux.HandleFunc("/game/board", boardLayoutHandler)
	mux.HandleFunc("/game/move", moveHandler)

	log.Printf("server is listening at %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
