(function() {
    window.addEventListener("load", function() {
        newGame();
        addSetupListeners();
        document.getElementById('create-game-input').addEventListener("click", function() {
            if (this.checked) {
                $("id-input").disabled = true;
            } else {
                $("id-input").disabled = false;
            }
        })
    })

    var grid;
	const SHIPS = ["carrier", "battleship", "cruiser", "submarine", "destroyer"];
	var initial_ship_pos;
	var isHorizontal = true;

    // used to make game last even if page is refreshed
    /*function checkOngoingGame() {
        if(localStorage.getItem("gameID") && localStorage.getItem("shipLocations")) {
            shipLoc = JSON.parse(localStorage.getItem("shipLocations"))
            for(i = 0; i < shipLoc.length; i++) {
                if (shipLoc.orientation = "horizontal") {
                    for (let j = 0; j < shipLoc[i].size; j++) {
                        grid.cells[shipLoc[i].row][shipLoc[i].col] = 1
                        $("p1_cell_" + shipLoc[i].row + "_" + shipLoc[i].col).classList.add("occupied");
                        shipLoc[i].col++;
                    }
                } else {
                    for (let j = 0; j < shipLoc[i].size; j++) {
                        grid.cells[shipLoc[i].row][shipLoc[i].col] = 1
                        $("p1_cell_" + shipLoc[i].row + "_" + shipLoc[i].col).classList.add("occupied");
                        shipLoc[i].row++;
                    }
                }
            }
            allPiecesPlaced()
            initializeWebSockets(localStorage.getItem("gameID"))
        }
    }*/

    function newGame() {
        grid = new Grid();
		initial_ship_pos = [];
        let newGame = new Game()
        $("pieces").style.display = "inline-block";
        $("settings").style.display = "none";
        $("stats").style.display = "none";
    }

    // helper function to get element by id
    function $(id) {
        return document.getElementById(id);
    }

    function Game() {
		Game.size = 10;
		Game.gameOver = false;
		this.createGrid("player1GB");
        this.createGrid("player2GB");
	}

	Game.prototype.createGrid = function(player) {
		let gridBoard = $(player)
		let identifier = "p1";
		if (player == "player2GB") {
			identifier = "p2";
		}
		for (let i = 0; i < Game.size; i++) {
			for (let j = 0; j < Game.size; j++) {
				let el = document.createElement('div');
				el.setAttribute('row', i);
				el.setAttribute('col', j);
				el.id = identifier + "_" + "cell_" + i + "_" + j;
				el.classList.add("cell")
				gridBoard.appendChild(el);
			}
		}
    }

    function Grid() {
		this.size = 10;
		this.cells = createCells();
	}

	// Types of cells: empty = 0, occupied = 1, hit = 2, miss = 3
	function createCells() {
		let cells = [];
		for (var x = 0; x < 10; x++) {
			cells[x] = [];
			for (var y = 0; y < 10; y++) {
				// empty cell
				cells[x][y] = 0;
			}
		}
		return cells;
    }

	function addHoverToGrid(piece) {
		let type = piece.innerText
        let size;
		if (type === "Carrier") {
			size = 5;
		} else if (type === "Battleship") {
			size = 4;
		} else if (type === "Cruiser") {
			size = 3;
		} else if (type === "Submarine") {
			size = 3;
		} else {
			size = 2;
        }
		let cells = $("player1GB").childNodes
		for (let i = 0; i < cells.length; i++) {
			let cell = cells[i]
			cell.onmouseenter = function() {
				let row = cell.getAttribute("row");
				let col = cell.getAttribute("col");
				if (isHorizontal) {
					if (parseInt(col) + size < 11) {
						for (let j = 0; j < size; j++) {	
							$("p1_cell_" + row + "_" + col).classList.add("hoverAttr");
							col++;
						}
					}
				} else {
					if (parseInt(row) + size < 11) {
						for (let j = 0; j < size; j++) {	
							$("p1_cell_" + row + "_" + col).classList.add("hoverAttr");
							row++;
						}
					}
				}
			};
			cell.onmouseleave = function() {
				let row = cell.getAttribute("row");
				let col = cell.getAttribute("col");
				if (isHorizontal) {
					if (parseInt(col) + size < 11) {
						for (let j = 0; j < size; j++) {	
							$("p1_cell_" + row + "_" + col).classList.remove("hoverAttr");
							col++;
						}
					}
				} else {
					if (parseInt(row) + size < 11) {
						for (let j = 0; j < size; j++) {	
							$("p1_cell_" + row + "_" + col).classList.remove("hoverAttr");
							row++;
						}
					}
				}
			};
			cell.onclick = function() {
				let row = cell.getAttribute("row");
				let col = cell.getAttribute("col");

				if (isValidLocation(parseInt(row), parseInt(col), size)) {
					if (isHorizontal) {
						initial_ship_pos.push({name: type, row: row, col: col, size: size, orientation: "horizontal"});
						for (let j = 0; j < size; j++) {
							grid.cells[row][col] = 1
							$("p1_cell_" + row + "_" + col).classList.add("occupied");
							col++;
						}
					} else {
						initial_ship_pos.push({name: type, row: row, col: col, size: size, orientation: "vetical"});
						for (let j = 0; j < size; j++) {
							grid.cells[row][col] = 1
							$("p1_cell_" + row + "_" + col).classList.add("occupied");
							row++;
						}
					}
					$("pieces").removeChild(piece);
	
					if (allPiecesAreRemoved()) {
						allPiecesPlaced()
					}
				}
			}
		}		
    }

    function allPiecesPlaced() {
        $("pieces").removeChild($("pieces-title"));
        $("pieces").removeChild($("orientation-button"));
        let playerCells = $("player1GB").getElementsByClassName("cell")
        for (let i = 0; i < playerCells.length; i++) {
            playerCells[i].classList.add("setup-done");
        }
        $("pieces").style.display = "none";
        $("settings").style.display = "inline-block";
        addSettingsListeners(initial_ship_pos);
    }
    
    function addSettingsListeners(initial_ship_pos) {
        $("startgame-button").addEventListener("click", function() {
            var gameID = $("id-input").value
            var p = document.createElement("P")
            p.innerHTML = "Waiting for opponent...";
            $("settings").appendChild(p)
            $("id-input").disabled = true;
            $("friend-input").disabled = true;
            $('create-game-input').disabled = true;
            initializeWebSockets(gameID, $("friend-input").checked);
        });
    }

	function isValidLocation(row, col, shipSize) {
		if (isHorizontal) {
			if (col + shipSize < 11) {
				for (let i = 0; i < shipSize; i++) {
					if (grid.cells[row][col] != 0) {
						return false;
					}
					col++;
				}
            } else {
                return false;
            }
		} else {
		    if (row + shipSize < 11) {
				for (let  i = 0; i < shipSize; i++) {
					if (grid.cells[row][col] != 0) {
						return false;
					}
					row++;
				}
			} else {
                return false;
            }
		}
		return true;
	}

	function allPiecesAreRemoved() {
		let pieces = document.getElementsByClassName("piece");
		if (pieces.length == 0) {
			return true;
		}
		return false;
	}

    function addSetupListeners() {
        let button = $("orientation-button");
        button.addEventListener('click', function() {
            isHorizontal = !isHorizontal;
        });

        let pieceObjs = document.getElementsByClassName("piece")
        for (let i = 0; i < pieceObjs.length; i++) {
            let piece = pieceObjs[i]
            piece.onmousedown = function() {
                piece.classList.toggle("piece-selected")
                addHoverToGrid(piece)
            };
        }
    }

    var playWebSocket;

    function initializeWebSockets(inputGameID, friendGame) {
        //let playWebSocket = new WebSocket("ws://localhost:4000/game/play"); 
        if(playWebSocket) {
            playWebSocket.close()
        }
        playWebSocket = new WebSocket("wss://api.dr4gonhouse.me/v1/game/play/?auth=" + localStorage.getItem("authorization")); 
        
        playWebSocket.onmessage = function(event) {
            if (event.data.startsWith("your turn|") || event.data.startsWith("opponent's turn|")) {
                $("settings").style.display = "none";
                $("stats").style.display = "inline-block";
                let cells = $("player2GB").childNodes;
                for (let i = 0; i < cells.length; i++) {
                    let cell = cells[i];
                    cell.onclick = function () {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");
                        sendMoveMessage(row, col);
                    }
                    cell.onmouseenter = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        if($("p2_cell_" + row + "_" + col)) {
                            $("p2_cell_" + row + "_" + col).classList.add("hoverAttr");
                        }
                    }
                    cell.onmouseleave = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        if($("p2_cell_" + row + "_" + col)) {
                            $("p2_cell_" + row + "_" + col).classList.remove("hoverAttr");
                        }
                    }
                }

                // setting information for when the user's turn is the first turn
                if (event.data.startsWith("your turn|")) {
                    turn = true;
                    document.getElementById("whose-turn").innerHTML = "It's your turn";
                    let playerCells = $("player2GB").getElementsByClassName("cell")
                    for (let i = 0; i < playerCells.length; i++) {
                        playerCells[i].classList.remove("setup-done");
                    }
                } else {
                    turn = false;
                    document.getElementById("whose-turn").innerHTML = "Your opponent is taking their turn";
                    let playerCells = $("player2GB").getElementsByClassName("cell")
                    for (let i = 0; i < playerCells.length; i++) {
                        playerCells[i].classList.add("setup-done");
                    }
                }
                // used to make game last even if page is refreshed
                /*localStorage.setItem("shipLocations", sessionStorage.getItem("shipL"))
                localStorage.setItem("gameID", $('id-input').value)*/

                // adding chat if it doesn't already exist
                var oppID = event.data.split("|")[1]
                fetch("https://api.dr4gonhouse.me/v1/users/"+ oppID, {
                    method: "GET",
                    headers: {
                        "authorization": localStorage.getItem("authorization")
                    }
                })
                    .then(async (response) => {
                        if(response.status >= 300) {
                            var text = await response.text()
                            infoDivToggle("error", response.status, text)
                        } else {
                            var userInfo = await response.json()
                            $('opponent-grid-title').innerHTML = userInfo.userName + "'s Board"
                            addToChatHeader({"friendid":userInfo.id, "username":userInfo.userName})
                        }
                    }) 
                    .catch((err) => console.log(err))
            } else if (event.data.split(";").length == 3) {
                // game is over
                if (event.data.split(";")[2] == "win") {
                    document.getElementById("game-over").innerHTML = "You won!";
                } else {
                    document.getElementById("game-over").innerHTML = "You lost :(";
                }
                
                let playerCells = $("player2GB").getElementsByClassName("cell")
                for (let i = 0; i < playerCells.length; i++) {
                    playerCells[i].classList.add("setup-done");
                }
                // when clicked, should return to home will return the user to the board page
                document.getElementById("return-to-home").style.display = "block";
                document.getElementById("return-to-home").onclick = function() {
                    location.reload()
                }
            } else {
                let coordinates = event.data.split(";")[0].split(",");
                let row = coordinates[0];
                let col = coordinates[1];
                let hitOrMiss = event.data.split(";")[1]
                let playerCells = $("player2GB").getElementsByClassName("cell")
                if (document.getElementById("whose-turn").innerHTML == "It's your turn") {
                    $("p2_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    document.getElementById("whose-turn").innerHTML = "Your opponent is taking their turn";
                    for (let i = 0; i < playerCells.length; i++) {
                        playerCells[i].classList.add("setup-done");
                    }
                } else {
                    $("p1_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    document.getElementById("whose-turn").innerHTML = "It's your turn";
                    for (let i = 0; i < playerCells.length; i++) {
                        playerCells[i].classList.remove("setup-done");
                    }
                }
            }
        }

        playWebSocket.onopen = async () => {
            let shipLocations = "";
            for (let i = 0; i < Game.size; i++) {
                for (let j = 0; j < Game.size; j++) {
                    if (grid.cells[i][j] == 1) {
                        shipLocations += i + "," + j + ",";
                    }
                }
            }  
            checkForGames(inputGameID, friendGame, shipLocations)
            // used to make game last even if page is refreshed
            //sessionStorage.setItem("shipL", JSON.stringify(shipLocations))
        }

        playWebSocket.onerror = (err) => {
            alert(err.toString() + " Proceeding to reload page")
            console.log(err.toString())
            window.reload()
        }
        
        playWebSocket.onclose = () => {
            alert("Connection closed by you or peer. Refreshing page after you hit ok.")
            location.reload()
        }

        // sends the location of a user's guess to the websocket
        function sendMoveMessage(row, col) {
            let message = row + "," + col;
            playWebSocket.send(message);
        }   
        
        function createNewGame(private, shipLocations) {
            var token = localStorage.getItem("authorization")
            var details = {"public":!private}
            fetch("https://api.dr4gonhouse.me/v1/game", {
                method: "POST",
                headers: {
                    "authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(details)
            })
                .then(async (response) => {
                    if (response.status >= 300) {
                        var text = await response.text()
                        infoDivToggle("error", response.status, text)
                    } else {
                        var gameInfo = await response.json()
                        $('id-input').value = gameInfo.id
                        $('friend-input').checked = !gameInfo.public
                        let message = gameInfo.id + ";" + shipLocations;
                        playWebSocket.send(message);
                    }
                })
                .catch((err) => console.log(err))
        }

        function checkForGames(gameID, friendGame, shipLocations) {
            var token = localStorage.getItem("authorization")
            url = "https://api.dr4gonhouse.me/v1/game"
            if (gameID) {
                url += "/" + gameID
            } else if(friendGame) {
                createNewGame(friendGame, shipLocations)
                return;
            }
            fetch(url, {
                method: "GET",
                headers: {
                    "authorization": token
                }
            })
                .then(async (response) => {
                    if(response.status >= 300) {
                        var text = await response.text()
                        if (text == "No games available") {
                            createNewGame(friendGame, shipLocations)
                        } else {
                            infoDivToggle("error", response.status, text)
                        }
                    } else {
                        var gameInfo = await response.json()
                        var ongoingGame = false
                        // used to make game last even if page is refreshed
                        /*gameInfo.players.forEach((player) => {
                            if(player.username == localStorage.getItem("currUser")) {
                                $('id-input').value = gameInfo.id
                                let message = gameInfo.id + ";" + shipLocations;
                                playWebSocket.send(message);
                                ongoingGame = true
                            }
                        })*/
                        if(!ongoingGame) {
                            addUserToGame(gameInfo.id, shipLocations)
                        }
                    }
                })
                .catch((err) => console.log(err))
        }

        function addUserToGame(gameID, shipLocations) {
            var token = localStorage.getItem("authorization")
            url = "https://api.dr4gonhouse.me/v1/game/" + gameID
            fetch(url, {
                method: "PATCH",
                headers: {
                    "authorization": token,
                }
            })
                .then(async (response) => {
                    if(response.status >= 300) {
                        var text = await response.text()
                        infoDivToggle("error", response.status, text)
                    } else {
                        var gameInfo = await response.json()
                        $('id-input').value = gameInfo.id
                        let message = gameInfo.id + ";" + shipLocations;
                        playWebSocket.send(message);
                    }
                })
                .catch((err) => console.log(err))
        }
    }
})()