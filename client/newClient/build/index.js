
(function() {

    var openConn = null;

    
    window.onload = function() {/*
        document.getElementById("signuppage").onclick = function() {
            document.getElementById("signindiv").style.display = "none"
            document.getElementById("signupdiv").style.display = "block"
            document.getElementById("loggedindiv").style.display = "none"
        }

        document.getElementById("signinpage").onclick = function() {
            document.getElementById("signindiv").style.display = "block"
            document.getElementById("signupdiv").style.display = "none"
            document.getElementById("loggedindiv").style.display = "none"
        }

        document.getElementById("signout").addEventListener("click", signOut)
        document.getElementById("signin").addEventListener("click", signIn)
        document.getElementById("signup").addEventListener("click", signUp)
        //document.getElementById("deleteUser").addEventListener("click", deleteUser)
        document.getElementById("addfriendbutton").addEventListener("click", addFriend)
        document.getElementById("updateFriendsList").addEventListener("click", getFriends)
        document.getElementById("addfriendinput").addEventListener("input", autocompleteFriends)
        /*document.getElementById("addfriendinput").addEventListener("focusout", function(e) {
            if (document.activeElement.className != "autocomplete-list-items") {
                console.log(document.activeElement)
                removeAutocomplete()
            }
        })
        checkSignedIn()*/
        document.getElementById("signinpage").style.display = "none";
        document.getElementById("signindiv").style.display = "none"
        document.getElementById("signupdiv").style.display = "none"
        document.getElementById("loggedindiv").style.display = "block";
        newGame();
        addSetupListeners();
    }

    function toggleLandingPage(displays) {
        document.getElementById("signindiv").style.display = displays[0]
        document.getElementById("signupdiv").style.display = displays[1]
        document.getElementById("loggedindiv").style.display = displays[2];
        if (displays[2] == "block") {
            document.getElementById("welcome-header").innerHTML = "Welcome " + localStorage.getItem("currUser")
        }
    }

    function infoDivToggle(func, status, text) {
        infoDiv = document.getElementById("infodiv")
        if (func == "reset") {
            infoDiv.style.display = "none"
        } else if (func == "error") {
            infoDiv.style.display = "block"
            infoDiv = document.getElementById("infodiv")
            infoDiv.innerHTML = "Error " + status + ": " + text
            infoDiv.style.backgroundColor = "red"
        } else {
            infoDiv.style.display = "block"
            infoDiv = document.getElementById("infodiv")
            infoDiv.innerHTML = "Success: " + text
            infoDiv.style.backgroundColor = "green"
        }
    }

    function checkSignedIn() {
        infoDivToggle("reset", null, null)
        var token = localStorage.getItem("authorization")
        if (token) {
            toggleLandingPage(["none", "none", "block"])
            getFriends()
        }
    }

    function signIn() {
        infoDivToggle("reset", null, null)
        console.log("in signin func")
        var email = document.getElementById("signin_email").value
        var password = document.getElementById("signin_password").value
        document.getElementById("signin_email").value = ""
        document.getElementById("signin_password").value = ""

        var details = {"email":email, "password":password}
        // POST v1/player
        fetch("https://api.dr4gonhouse.me/v1/sessions", { //https://api.dr4gonhouse.me/v1/summary?url=http://ogp.me
            method: "POST",
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify(details)
        })
            .then(async (response) => {
                console.log(response)
                if(response.status > 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                    console.log(text)
                } else {
                    response.headers.forEach((value, key) => {
                        if (key == "content-type") {
                            if (value != "application/json") {
                                console.log("Error in response")
                            }
                        } else if (key == "authorization") {
                            window.localStorage.setItem(key, value)
                        }
                        console.log(key + " " + value)
                    });
                    var newResponse = await response.json()
                    console.log(newResponse)
                    localStorage.setItem("currUser", newResponse.userName)
                    toggleLandingPage(["none", "none", "block"])
                    getFriends()
                }
            })
            .catch((err) => console.log(err))
    }

    function signOut() {
        console.log("in signout func")
        infoDivToggle("reset", null, null)
        var token = window.localStorage.getItem("authorization")
        // DELETE v1/player/id
        fetch("https://api.dr4gonhouse.me/v1/sessions/mine", {
            method: "DELETE",
            headers: {
                "authorization": token
            }
        })
            .then(async (response) => {
                if (response.status >= 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                } else {
                    console.log(response)
                    document.getElementById("friendslist").innerHTML = ""
                    document.getElementById("friendrequestlist").innerHTML = ""
                    document.getElementById("chat-text").innerHTML = ""
                    //document.getElementById("chat-received").innerHTML = ""
                    //document.getElementById("chat-sent").innerHTML = ""
                    document.getElementById("chat-header").innerHTML = ""
                    document.getElementById("chat-input-text").value = ""
                    toggleLandingPage(["block", "none", "none"])
                    if(openConn) {
                        openConn.close()
                    }
                    localStorage.removeItem("authorization")
                    localStorage.removeItem("currUser")
                    infoDivToggle("success", response.status, "Signed Out")
                }
            })
            .catch((err) => console.log(err))
    }

    function signUp() {
        infoDivToggle("reset", null, null)
        var email = document.getElementById("signup_email").value
        var username = document.getElementById("username").value
        var first = document.getElementById("firstname").value
        var last = document.getElementById("lastname").value
        var pass = document.getElementById("signup_password").value
        var passconf = document.getElementById("passconf").value
        
        document.getElementById("signup_email").value = ""
        document.getElementById("username").value = ""
        document.getElementById("firstname").value = ""
        document.getElementById("lastname").value = ""
        document.getElementById("signup_password").value = ""
        document.getElementById("passconf").value = ""

        var token = window.localStorage.getItem("authorization")
        var details = {
            "email": email,
            "password": pass,
            "passwordConf": passconf,
            "userName": username,
            "firstName": first,
            "lastName":last
        }
        // POST /v1/player
        fetch("https://api.dr4gonhouse.me/v1/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": token
            },
            body: JSON.stringify(details)
        })
            .then(async (response) => {
                if (response.status >= 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                } else {
                    response.headers.forEach((value, key) => {
                        if (key == "content-type") {
                            if (value != "application/json") {
                                console.log("Error in response")
                            }
                        } else if (key == "authorization") {
                            window.localStorage.setItem(key, value)
                        }
                        console.log(key + " " + value)
                    });
                    var newResponse = await response.json()
                    console.log(newResponse)
                    localStorage.setItem("currUser", newResponse.userName)
                    toggleLandingPage(["none", "none", "block"])
                }
            })
            .catch((err) => console.log(err))
    }

    function deleteUser() {

    }

    function addFriend() {
        infoDivToggle("reset", null, null)
        var token = localStorage.getItem("authorization")
        var url = "https://api.dr4gonhouse.me/v1/friends/" + document.getElementById("addfriendinput").value
        document.getElementById("addfriendinput").value = ""
        var details = {"accepted":false}
        fetch(url, {
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
                    var text = await response.text()
                    infoDivToggle("success", response.status, text)
                    getFriends()
                }
                console.log(response)
            })
            .catch((err) => console.log(err))
    }

    function getFriends() {
        infoDivToggle("reset", null, null)
        var token = localStorage.getItem("authorization")

        fetch("https://api.dr4gonhouse.me/v1/friends", {
            method: "GET",
            headers: {
                "authorization": token,
            }
        })
            .then(async (response) => {
                if (response.status >= 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                } else {
                    var friendDetails = await response.json()
                    var friends = friendDetails['friends']
                    var friendRequests = friendDetails['friendRequests']
                    var friendList = document.getElementById("friendslist")
                    friendList.innerHTML = ""
                    var friendRequestList = document.getElementById("friendrequestlist")
                    friendRequestList.innerHTML = ""
                    friends.forEach(friend => {
                        htmlVal = "<li>" + friend.username
                        if (!friend.accepted) {
                            htmlVal += " <strong>Not acccepted</strong></li>"
                        } else {
                            htmlVal += "</li>"
                        }
                        friendList.innerHTML += htmlVal
                    });

                    friendRequests.forEach(fr => {
                        div = document.createElement("DIV")
                        p = document.createElement("li")
                        p.innerHTML = fr.username
                        div.appendChild(p)
                        button = document.createElement("BUTTON")
                        button.id = "fr_" + fr.username + "button"
                        button.value = fr.username
                        button.innerHTML = "Accept"
                        button.onclick = acceptFriend;

                        declineButton = document.createElement("BUTTON")
                        declineButton.id = "fr_decline_" + fr.username + "button" 
                        declineButton.value = fr.username
                        declineButton.innerHTML = "Decline"
                        declineButton.onclick = declineFriend;

                        div.appendChild(button)
                        div.appendChild(declineButton)
                        friendRequestList.appendChild(div)
                    })
                    
                    await fillChatHeader(friends)
                    console.log(friends)
                }
            }) 
            .catch((err) => console.log(err))
    }

    async function fillChatHeader(friends) {
        var header = document.getElementById("chat-header")
        header.innerHTML = ""
        var token = localStorage.getItem("authorization")
        friends.forEach(async (friend) => {
            await fetch("https://api.dr4gonhouse.me/v1/channels?friendID=" + friend.friendid, {
                method: "GET",
                headers: {
                    "authorization": token
                }
            })
                .then(async (response) => {
                    if (response.status >= 300) {
                        var text = await response.text()
                        infoDivToggle("error", response.status, text)
                    } else {
                        var channel = await response.json()
                        if(!channel[0]) {
                            createNewChannel(friend)
                            return;
                        }
                        channel[0].members.forEach((member) => {
                            if (member.username == friend.username) {
                                var friendDiv = document.createElement("DIV")
                                friendDiv.id = channel[0].id
                                friendDiv.className = "chat-header-item"
                                friendDiv.innerHTML = friend.username
                                friendDiv.onclick = openFriendChat
                                header.append(friendDiv)
                                return;
                            }
                        })
                    }
                })
                .catch((err) => console.log(err))
        })
    }

    function createNewChannel(friend) {
        var header = document.getElementById("chat-header")
        var name = localStorage.getItem("currUser") + "-" + friend.username
        var token = localStorage.getItem("authorization")
        var details = {"name": name, "private":true, "otherUserName": friend.username}
        fetch("https://api.dr4gonhouse.me/v1/channels", {
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
                    var newChannel = await response.json()
                    newChannel.members.forEach((member) => {
                        if (member.username == friend.username) {
                            var friendDiv = document.createElement("DIV")
                            friendDiv.id = newChannel.id
                            friendDiv.className = "chat-header-item"
                            friendDiv.innerHTML = friend.username
                            friendDiv.onclick = openFriendChat
                            header.append(friendDiv)
                            return;
                        }
                    })
                }
            })
            .catch((err) => console.log(err))
    }

    function openFriendChat() {
        document.getElementById("chat-text").innerHTML = ""
        var prev = document.getElementsByClassName("chat-header-active")
        for (var i = 0; i < prev.length; i++) {
            if(prev[i]) {
                prev[i].classList.remove("chat-header-active")
            }
        }
        this.classList.add("chat-header-active")
        if (openConn) {
            openConn.close()
            document.getElementById("chat-text")
        }
        var url = "wss://api.dr4gonhouse.me/v1/channels/" + this.id + "/message?auth=" + localStorage.getItem("authorization")
        var conn = new WebSocket(url)
        openConn = conn
        var messageHandler = function() {
            var msg = document.getElementById("chat-input-text").value
            openConn.send(msg)   
            document.getElementById("chat-text").innerHTML += "<div id=chat-sent>" + msg + "</div>"
        }
        conn.onopen = function() {
            document.getElementById("send-chat").addEventListener("click", messageHandler)
        }
        conn.onerror = function(error) {
            console.error('WebSocket Error ' + error);
        }
        conn.onclose = function() {
            document.getElementById("send-chat").removeEventListener("click", messageHandler)
        }
        conn.onmessage = function(e) {
            if(e.data.startsWith("Error")) {
                infoDivToggle("error", 500, e.data)
                return;
            }
            var messages = JSON.parse(e.data)
            console.log(messages)
            if(messages["type"] && messages["type"] == "old") {
                var sortedMsgs = messages['messages'].sort((a, b) =>  Date.parse(a.createdAt) - Date.parse(b.createdAt))
                console.log(sortedMsgs)
                for (var i = 0; i < sortedMsgs.length; i++) {
                    if (sortedMsgs[i].creator.username != localStorage.getItem("currUser")) {
                        document.getElementById("chat-text").innerHTML += "<div id=chat-received>" + sortedMsgs[i].body + "</div>"
                    } else {
                        document.getElementById("chat-text").innerHTML += "<div id=chat-sent>" + sortedMsgs[i].body + "</div>"
                    }
                }
            } else {
                document.getElementById("chat-text").innerHTML += "<div id=chat-received>" + sortedMsgs.body + "</div>"
                document.getElementById("chat-input-text").value = ""
            }
        }
    }

    function declineFriend() {
        infoDivToggle("reset", null, null)
        var token = localStorage.getItem("authorization")
        var details = {"accepted":false, "reject": true}
        var url = "https://api.dr4gonhouse.me/v1/friends/" + this.value
        fetch(url, {
            method: "POST",
            headers: {
                "authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(details)
        })
            .then(async (response) => {
                var text = await response.text()
                if (response.status >= 300) {
                    infoDivToggle("error", response.status, text)
                } else {
                    infoDivToggle("success", response.status, text)
                    getFriends()
                }
            })
            .catch((err) => console.log(err))
    }

    function acceptFriend() {
        console.log("in accept friend")
        infoDivToggle("reset", null, null)
        var token = localStorage.getItem("authorization")
        var details = {"accepted":true}
        var url = "https://api.dr4gonhouse.me/v1/friends/" + this.value
        fetch(url, {
            method: "POST",
            headers: {
                "authorization": token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(details)
        })
            .then(async (response) => {
                var text = await response.text()
                if (response.status >= 300) {
                    infoDivToggle("error", response.status, text)
                } else {
                    infoDivToggle("success", response.status, text) 
                    getFriends()
                }
            })
            .catch((err) => console.log(err))
    }

    function removeAutocomplete() {
        var divs = document.getElementsByClassName("autocomplete-list-items")
        if(divs) {
            for(var i = 0; i < divs.length; i++) {
                divs[i].parentNode.removeChild(divs[i])
            }
        }
    }

    function autocompleteFriends() {
        removeAutocomplete()
        if (this.value == "") {
            return;
        }
        infoDivToggle("reset", null, null)
        var value = this.value 
        var token = localStorage.getItem("authorization")
        console.log(value)
        var url = "https://api.dr4gonhouse.me/v1/friends/" + value

        div = document.createElement("DIV")
        div.id = "autocomplete-list"
        div.className = "autocomplete-items"
        var parentNode = this.parentNode
        fetch(url, {
            method: "GET",
            headers: {
                "authorization": token
            }
        })
            .then(async (response) => {
                if (response.status >= 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                } else {
                    var autofillList = await response.json()
                    if (value != document.getElementById("addfriendinput").value) {
                        return;
                    }
                    console.log(autofillList)
                    parentNode.appendChild(div)
                    autofillList.forEach(user => {
                        itemDiv = document.createElement("DIV")
                        itemDiv.className = "autocomplete-list-items"
                        itemDiv.innerHTML = "<strong>" + user.username.substr(0, value.length) + "</strong>"
                        itemDiv.innerHTML += user.username.substr(value.length)
                        itemDiv.innerHTML += "<input type='hidden' value='" + user.username + "'>"
                        itemDiv.addEventListener("click", function(e) {
                            document.getElementById("addfriendinput").value = this.getElementsByTagName("input")[0].value
                            removeAutocomplete()
                        })
                        div.appendChild(itemDiv)
                        
                    })
                }
            })
            .catch((err) => console.log(err))

    }

    var grid;
	const SHIPS = ["carrier", "battleship", "cruiser", "submarine", "destroyer"];
	var initial_ship_pos;
	var isHorizontal = true;

    function newGame() {
        grid = new Grid();
		initial_ship_pos = [];
        let newGame = new Game()
        $("pieces").style.display = "block";
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

    /* Populate opponents grid with layout specified, should get this information
	// from backend
	// positions should be a list of this [{name: "Carrier", row: 3, col: 1, size: 3, orientation: "horizontal"}, ...]
	function populateOpponentsGrid(positions) {
		for (let i = 0; i < positions.length; i++) {
			let col = positions[i].col;
			let row = positions[i].row;
			console.log(positions[i].size)
			if (positions[i].orientation === "horizontal") {
				for (let j = 0; j < positions[i].size; j++) {
					$("p2_cell_" + row + "_" + col).classList.add("occupied");
					col++;
				}
			} else {
				for (let j = 0; j < positions[i].size; j++) {
					$("p2_cell_" + row + "_" + col).classList.add("occupied");
					row++;
				}
			}
		}
	}*/

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
						$("pieces").removeChild($("pieces-title"));
						$("pieces").removeChild($("orientation-button"));
						console.log(initial_ship_pos);
						let playerCells = $("player1GB").getElementsByClassName("cell")
						for (let i = 0; i < playerCells.length; i++) {
							playerCells[i].classList.add("setup-done");
						}
                        $("pieces").style.display = "none";
                        $("settings").style.display = "block";
                        addSettingsListeners(initial_ship_pos);
					}
				}
			}
		}		
    }
    
    function addSettingsListeners(initial_ship_pos) {
        $("generateID-button").addEventListener("click", function() {
            let id = generateUniqueID();
        })
        $("startgame-button").addEventListener("click", function() {
            $("settings").innerHTML = "Waiting for opponent...";
            initializeWebSockets();
        });
    }

    function startGame(isRandom, gameID) {
        // Establish Web Socket connection with a random or friend
            // send initial position of ships for current user
            // get back opposing players positions
            // update opponents grid
            // populateOpponentsGrid(initial_ship_pos);
            // add event listeners for each cell (so user can click to attack)
            // for each move get the result and update the table && statistics
        if (isRandom) {
            console.log("Starting game against random");
        } else {
            console.log("Starting game with friend with id " + gameID);
        }
    }

	function generateUniqueID() {
		return '_' + Math.random().toString(36).substr(2, 9);
	}


	function isValidLocation(row, col, shipSize) {
        console.log(grid);
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
            console.log("clicked");
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

    function initializeWebSockets() {
        //let playWebSocket = new WebSocket("ws://localhost:4000/game/play"); 
        let playWebSocket = new WebSocket("ws://api.dr4gonhouse.me/game/play"); 
        
        playWebSocket.onmessage = function(event) {
            if (event.data == "your turn" || event.data == "opponent's turn") {
                $("settings").style.display = "none";
                $("stats").style.display = "block";
                let cells = $("player2GB").childNodes;
                for (let i = 0; i < cells.length; i++) {
                    let cell = cells[i];
                    cell.onclick = function () {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");
                        console.log(row);
                        console.log(col);
                        sendMoveMessage(row, col);
                    }
                    cell.onmouseenter = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        $("p2_cell_" + row + "_" + col).classList.add("hoverAttr");
                    }
                    cell.onmouseleave = function() {
                        let row = cell.getAttribute("row");
                        let col = cell.getAttribute("col");	
                        $("p2_cell_" + row + "_" + col).classList.remove("hoverAttr");
                    }
                }
                if (event.data == "your turn") {
                    turn = true;
                    document.getElementById("whose-turn").innerHTML = "It's your turn";
                } else {
                    turn = false;
                    document.getElementById("whose-turn").innerHTML = "Your opponent is taking their turn";
                }
            } else if (event.data.split(";").length == 3) {
                // game is over
                if (event.data.split(";")[2] == "win") {
                    document.getElementById("game-over").innerHTML = "You won!";
                } else {
                    document.getElementById("game-over").innerHTML = "You lost :(";
                }
                
                // when clicked, should return to home will return the user to the board page
                document.getElementById("return-to-home").innerHTML = "Return to home";
            } else {
                let coordinates = event.data.split(";")[0].split(",");
                let row = coordinates[0];
                let col = coordinates[1];
                let hitOrMiss = event.data.split(";")[1]
                if (document.getElementById("whose-turn").innerHTML == "It's your turn") {
                    $("p2_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    document.getElementById("whose-turn").innerHTML = "Your opponent is taking their turn";
                } else {
                    $("p1_cell_" + row + "_" + col).classList.add(hitOrMiss);
                    document.getElementById("whose-turn").innerHTML = "It's your turn";
                }
            }
        }

        playWebSocket.onopen = () => {
            //let friendInput = $("friend-input");
            //let randInput = $("random-input");
            //if ((friendInput.checked && $("id-input").value.length > 0)) {
                //let gameID = $("id-input").value;
                //let isRandom = randInput.checked;

                //startGame(isRandom, gameID);
            //}

            let shipLocations = "";
            for (let i = 0; i < Game.size; i++) {
                for (let j = 0; j < Game.size; j++) {
                    if (grid.cells[i][j] == 1) {
                        shipLocations += i + "," + j + ",";
                    }
                }
            }  
            let gameID = 1;
            let message = gameID + ";" + shipLocations;
            playWebSocket.send(message);
        }
        
        // sends the location of a user's guess to the websocket
        function sendMoveMessage(row, col) {
            let message = row + "," + col;
            playWebSocket.send(message);
        }        
    }
})()