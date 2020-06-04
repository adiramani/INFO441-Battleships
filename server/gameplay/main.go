package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"

	"fmt"

	"github.com/gorilla/websocket"
)

var mx sync.Mutex

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type connectedUser struct {
	connection     *websocket.Conn
	opponentID     int
	gameID         string
	pieceLocations [][]bool
	guessLocations [][]bool
	turn           bool
}

// contains all users currently playing the game
var connectedUsers map[int]*connectedUser

// startGameHandler stores information about a user
func playHandler(w http.ResponseWriter, r *http.Request) {
	if len(connectedUsers) == 0 {
		connectedUsers = make(map[int]*connectedUser)
	}
	if r.Header.Get("X-User") == "" {
		http.Error(w, "Error: unauthorized request", 401)
		return
	}

	// extract integer ID from header
	strUserID := strings.Split(r.Header.Get("X-User"), ":")[1]
	strUserID = strUserID[:len(strUserID)-1]
	userID, err := strconv.Atoi(strUserID)
	if err != nil {
		http.Error(w, "Error: user ID is not an integer", 400)
		return
	}
	// allow requests from web browsers
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil || conn == nil {
		http.Error(w, "Connection error", 500)
		return
	}
	log.Printf("Starting websocket for %d", userID)
	for {
		_, message, err := conn.ReadMessage()
		log.Printf(string(message))
		if err != nil {
			// this deletes the connection for you and your opponent if
			// one of the connections close
			log.Printf("Error: %s for %d", err, userID)
			if connectedUsers[userID] != nil {
				if connectedUsers[userID].opponentID != -1 {
					if connectedUsers[connectedUsers[userID].opponentID] != nil {
						if connectedUsers[connectedUsers[userID].opponentID].connection != nil {
							err2 := connectedUsers[connectedUsers[userID].opponentID].connection.Close()
							if err2 != nil {
								log.Printf("Error: %s", err)
							}
						}
					}
				} else {
					if connectedUsers[userID].gameID != "" {
						newURL := fmt.Sprintf("https://api.dr4gonhouse.me/v1/game/%s", connectedUsers[userID].gameID)
						newReq, err3 := http.NewRequest("DELETE", newURL, nil)
						if err3 != nil {
							log.Printf("Error: %s for %d", err, userID)
						} else {
							newReq.Header.Set("Authorization", r.URL.Query().Get("auth"))
							client := http.Client{}
							resp, err4 := client.Do(newReq)
							if err4 != nil {
								log.Printf("Error: %s for %d", err, userID)
							} else {
								defer resp.Body.Close()
							}
						}
					}
				}
				delete(connectedUsers, userID)
			}
			return
		}
		mx.Lock()
		if connectedUsers[userID] == nil {
			setUpGame(string(message), userID, conn)
		} else {
			handleMove(string(message), userID)
		}
		mx.Unlock()
	}

}

func setUpGame(message string, userID int, conn *websocket.Conn) {
	user := &connectedUser{}
	gameID := strings.Split(string(message), ";")[0]
	user.gameID = gameID
	user.opponentID = -1
	user.turn = false

	piecesBoard := make([][]bool, 10)
	for i := range piecesBoard {
		piecesBoard[i] = make([]bool, 10)
	}
	user.pieceLocations = piecesBoard

	guessBoard := make([][]bool, 10)
	for i := range guessBoard {
		guessBoard[i] = make([]bool, 10)
	}
	user.guessLocations = guessBoard

	// pieceLocations is a comma seperated list of x, y values representing a user's board layout

	pieceLocations := strings.Split(strings.Split(string(message), ";")[1], (","))

	user.connection = conn
	// if both players for a game are connected, we can start the game
	for key := range connectedUsers {
		if connectedUsers[key].gameID == user.gameID {
			user.opponentID = key
			opponent := connectedUsers[key]
			opponent.opponentID = userID
			opponent.turn = true // might need to reinsert into hashmap?
			connectedUsers[key] = opponent
		}
	}

	connectedUsers[userID] = user
	for i := 0; i < 33; i += 2 {
		x, _ := strconv.Atoi(pieceLocations[i])
		y, _ := strconv.Atoi(pieceLocations[i+1])
		user.pieceLocations[x][y] = true
	}
	if user.opponentID != -1 {
		user.connection.WriteMessage(1, []byte(fmt.Sprintf("opponent's turn|%d", user.opponentID)))
		opponent := connectedUsers[user.opponentID]
		opponent.connection.WriteMessage(1, []byte(fmt.Sprintf("your turn|%d", userID)))
	}
}

func handleMove(message string, userID int) {
	x, _ := strconv.Atoi(strings.Split(string(message), (","))[0])
	y, _ := strconv.Atoi(strings.Split(string(message), (","))[1])

	user := connectedUsers[userID]
	opponent := connectedUsers[user.opponentID]
	if opponent == nil {
		log.Printf("unable to find opponent")
		return
	}

	user.guessLocations[x][y] = true
	user.turn = false
	opponent.turn = true
	// returns blue for a hit, red for a miss
	hitOrMiss := "miss"
	if user.guessLocations[x][y] && opponent.pieceLocations[x][y] {
		hitOrMiss = "hit"
	}
	gameOver := gameOver(user.guessLocations, opponent.pieceLocations)
	userMessage := strconv.Itoa(x) + "," + strconv.Itoa(y) + ";" + hitOrMiss
	opponentMessage := strconv.Itoa(x) + "," + strconv.Itoa(y) + ";" + hitOrMiss
	if gameOver {
		userMessage += ";win"
		opponentMessage += ";loss"
	}
	user.connection.WriteMessage(1, []byte(userMessage))
	opponent.connection.WriteMessage(1, []byte(opponentMessage))
	if gameOver {
		delete(connectedUsers, userID)
		delete(connectedUsers, user.opponentID)
	}
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
	addr := os.Getenv("GAMEADDR")
	if len(addr) == 0 {
		addr = ":80"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/game/play/", playHandler)

	log.Printf("server is listening at %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
