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
        document.getElementById("normalshot").addEventListener('click', function() {
            if(this.checked) {
                var horizthreeshot = document.getElementById("horizthreeshot")
                horizthreeshot.checked = !this.checked
                var verttwoshot = document.getElementById("verttwoshot")
                verttwoshot.checked = !this.checked
            }
        })
        document.getElementById("verttwoshot").addEventListener('click', function () {
            if (!this.disabled && this.checked) {
                document.getElementById("horizthreeshot").checked = !this.checked
                document.getElementById("normalshot").checked = !this.checked
            }
            if (!this.checked) {
                document.getElementById("normalshot").checked = this.checked
            }
        })
        document.getElementById("horizthreeshot").addEventListener('click', function () {
            if (!this.disabled && this.checked) {
                document.getElementById("verttwoshot").checked = !this.checked
                document.getElementById("normalshot").checked = !this.checked
            }
            if (!this.checked) {
                document.getElementById("normalshot").checked = this.checked
            }
        })

    })

    var grid;
	const SHIPS = ["carrier", "battleship", "cruiser", "submarine", "destroyer"];
	var initial_ship_pos;
	var isHorizontal = true;

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

	function addHoverToGrid(piece, selected) {
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
                if(selected) {
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
                }
			};
			cell.onmouseleave = function() {
                if(selected) {
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
                }
			};
			cell.onclick = function() {
                if(selected) {
                    let row = cell.getAttribute("row");
                    let col = cell.getAttribute("col");

                    if (isValidLocation(parseInt(row), parseInt(col), size, true)) {
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
                        selected = false
        
                        if (allPiecesAreRemoved()) {
                            allPiecesPlaced()
                        }
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
            $('startgame-button').disabled = true;
            initializeWebSockets(gameID, $("friend-input").checked);
        });
    }

	function isValidLocation(row, col, shipSize, horiz) {
		if (isHorizontal || horiz) {
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
                currI = piece.innerText
                for(let j = 0; j < pieceObjs.length; j++) {
                    if (currI != pieceObjs[j].innerText) {
                        pieceObjs[j].classList.remove("piece-selected")
                    }
                }
                piece.classList.toggle("piece-selected")
                addHoverToGrid(piece, piece.classList.contains("piece-selected"))
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
        var multipleShot = false
        var twoShotUse = 1
        var threeShotUse = 1
        var oppShipLoc = new Array(10)
        for (var a = 0; a < oppShipLoc.length; a++) {
            oppShipLoc[a] = new Array(10)
        }
        playWebSocket.onmessage = function(event) {
            // logic for multishot
            var message = event.data
            if(message.startsWith("startmulti")) {
                message = message.replace("startmulti", "")
                multipleShot = true
            } else if (message.startsWith("endmulti")){
                message = message.replace("endmulti", "")
                multipleShot = false
            }
            if (message.startsWith("your turn|") || message.startsWith("opponent's turn|")) {
                $("settings").style.display = "none";
                $("stats").style.display = "inline-block";
                let cells = $("player2GB").childNodes;
                // event handlers for cell once the game starts
                for (let i = 0; i < cells.length; i++) {
                    let cell = cells[i];
                    cell.onclick = function () {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");
                        valid = true
                        if($("horizthreeshot").checked) {
                            if (parseInt(col) + 3 >= 11) {
                                console.log("col + 3 >= 11: " + (col + 3))
                                valid = false
                            }
                        } else if ($("verttwoshot").checked) {
                            if (parseInt(row) + 2 >= 11) {
                                console.log("row +2 is > 11: " + (row + 2))
                                valid = false
                            }
                        }
                        if (cell.classList.contains("hit") || cell.classList.contains("miss")) {
                            console.log("class list false")
                            valid = false
                        }
                        if(valid) {
                            sendMoveMessage(row, col);
                        }
                    }
                    cell.onmouseenter = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        if ($("horizthreeshot").checked) {
                            if (parseInt(col) + 3 < 11) {
                                for (let j = 0; j < 3; j++) {	
                                    $("p2_cell_" + row + "_" + col).classList.add("hoverAttr");
                                    col++;
                                }
                            }
                        } else if($("verttwoshot").checked) {
                            if (parseInt(row) + 2 < 11) {
                                for (let j = 0; j < 2; j++) {	
                                    $("p2_cell_" + row + "_" + col).classList.add("hoverAttr");
                                    row++;
                                }
                            }
                        } else {
                            if($("p2_cell_" + row + "_" + col)) {
                                $("p2_cell_" + row + "_" + col).classList.add("hoverAttr");
                            }
                        }
                    }
                    cell.onmouseleave = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        if ($("horizthreeshot").checked) {
                            if (parseInt(col) + 3 < 11) {
                                for (let j = 0; j < 3; j++) {	
                                    $("p2_cell_" + row + "_" + col).classList.remove("hoverAttr");
                                    col++;
                                }
                            }
                        } else if($("verttwoshot").checked) {
                            if (parseInt(row) + 2 < 11) {
                                for (let j = 0; j < 2; j++) {	
                                    $("p2_cell_" + row + "_" + col).classList.remove("hoverAttr");
                                    row++;
                                }
                            }
                        } else {
                            if($("p2_cell_" + row + "_" + col)) {
                                $("p2_cell_" + row + "_" + col).classList.remove("hoverAttr");
                            }
                        }
                    }
                }

                // setting information for when the user's turn is the first turn
                if (message.startsWith("your turn|")) {
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
                    $('verttwoshot').disabled = true;
                    $('horizthreeshot').disabled = true;
                    $('normalshot').disabled = true;
                    for (let i = 0; i < playerCells.length; i++) {
                        playerCells[i].classList.add("setup-done");
                    }
                }

                // getting opponent ship locations
                var oppShips = message.split("|")[2].split(/[\[\]\s]/)
                var rowCount = 0
                var colCount = 0
                for (var l = 0; l < oppShips.length; l++) {
                    if(oppShips[l] != "") {
                        oppShipLoc[rowCount][colCount] = oppShips[l] == "true"
                        colCount++
                        if(colCount >= 10) {
                            colCount = 0
                            rowCount++
                        }
                    }
                }

                // adding chat if it doesn't already exist
                var oppID = message.split("|")[1]
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
            // this is a normal move in the game
            } else {
                let coordinates = message.split(";")[0].split(",");
                let row = coordinates[0];
                let col = coordinates[1];
                let hitOrMiss = message.split(";")[1]
                let playerCells = $("player2GB").getElementsByClassName("cell")
                // if its my turn, change the opponents div
                if (document.getElementById("whose-turn").innerHTML == "It's your turn") {
                    $("p2_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    if(!multipleShot) {
                        document.getElementById("whose-turn").innerHTML = "Your opponent is taking their turn";
                        $('verttwoshot').disabled = true;
                        $('horizthreeshot').disabled = true;
                        $('normalshot').disabled = true;
                        for (let i = 0; i < playerCells.length; i++) {
                            playerCells[i].classList.add("setup-done");
                        }
                    }
                    // see if i defeated any ships 
                    // didn't finish
                    /*$("oppdefeatedships").innerHTML = "<strong>Opponents Defeated Ships:</strong>"
                    for(var k = 0; k < oppShipLoc.length; k++) {
                        var currRow = initial_ship_pos[k].row
                        var currCol = initial_ship_pos[k].col
                        var numhits = 0
                        for(var s = 0; s < initial_ship_pos[k].size; k++) {
                            if($("p2_cell_" + currRow + "_" + currCol).classList.contains("hit")) {
                                numhits++
                            }
                        }
                        if (numhits == initial_ship_pos[k].size) {
                            $("oppdefeatedships").innerHTML += "<br>" + initial_ship_pos[k].name
                        }
                    }*/
                // if its opponents turn, change my battleship div
                } else {
                    $("p1_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    if(!multipleShot) {
                        if(twoShotUse > 0) {
                            $('verttwoshot').disabled = false;
                        }
                        if(threeShotUse > 0) {
                            $('horizthreeshot').disabled = false;
                        }
                        $('normalshot').disabled = false;
                        document.getElementById("whose-turn").innerHTML = "It's your turn";
                        for (let i = 0; i < playerCells.length; i++) {
                            playerCells[i].classList.remove("setup-done");
                        }
                    }
                    // didn't finish
                    /*$("mydefeatedships").innerHTML = "<strong>My Defeated Ships:</strong>"
                    for(var k = 0; k < initial_ship_pos.length; k++) {
                        var currRow = initial_ship_pos[k].row
                        var currCol = initial_ship_pos[k].col
                        var numhits = 0
                        for(var s = 0; s < initial_ship_pos[k].size; k++) {
                            if($("p1_cell_" + currRow + "_" + currCol).classList.contains("hit")) {
                                numhits++
                            }
                        }
                        if (numhits == initial_ship_pos[k].size) {
                            $("mydefeatedships").innerHTML += "<br>" + initial_ship_pos[k].name
                        }
                    }*/
                }
                // checking to see if game is over
                if(message.split(";").length == 3) {
                    if (message.split(";")[2] == "win") {
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
            var message = row + "," + col;
            if($("horizthreeshot").checked) {
                message += ",horizthreeshot"
                $("horizthreeshot").checked = false;
                $("horizthreeshot").disabled = true;
                threeShotUse--
            } else if ($("verttwoshot").checked) {
                $("verttwoshot").checked = false;
                $("verttwoshot").disabled = true;
                message += ",verttwoshot"
                twoShotUse--
            }
            playWebSocket.send(message);
        }   
        
        // creating new game
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
                            // if no games found, create a new game
                            createNewGame(friendGame, shipLocations)
                        } else {
                            infoDivToggle("error", response.status, text)
                        }
                    } else {
                        var gameInfo = await response.json()
                        addUserToGame(gameInfo.id, shipLocations)
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