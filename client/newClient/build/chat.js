function toggleLandingPage(displays) {
    document.getElementById("signindiv").style.display = displays[0]
    document.getElementById("signupdiv").style.display = displays[1]
    document.getElementById("loggedindiv").style.display = displays[2]
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
    if (func !== "reset") {
        setTimeout(function(){
            infoDivToggle("reset", null, null)
        }, 5000)
    }
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
            }
        }) 
        .catch((err) => console.log(err))
}

async function fillChatHeader(friends) {
    var header = document.getElementById("chat-header")
    header.innerHTML = ""
    friends.forEach((friend) => {
        addToChatHeader(friend)
    })
}

function addToChatHeader(friend) {
    var header = document.getElementById("chat-header")
    var token = localStorage.getItem("authorization")
    fetch("https://api.dr4gonhouse.me/v1/channels?friendID=" + friend.friendid, {
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
                            var currFriendDivs = document.getElementsByClassName("chat-header-item")
                            exists = false
                            for (var i = 0; i < currFriendDivs.length; i++) {
                                if (currFriendDivs[i].id == channel[0].id) {
                                    exists = true
                                }
                            }
                            if(!exists) {
                                var friendDiv = document.createElement("DIV")
                                friendDiv.id = channel[0].id
                                friendDiv.className = "chat-header-item"
                                friendDiv.innerHTML = friend.username
                                friendDiv.onclick = openFriendChat
                                header.append(friendDiv)
                                return;
                            }
                        }
                    })
                }
            })
            .catch((err) => console.log(err))
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

var openConn;

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
        document.getElementById("chat-text").scrollTop = document.getElementById("chat-text").scrollHeight
        document.getElementById("chat-input-text").value = ""
    }
    conn.onopen = function() {
        document.getElementById("send-chat").addEventListener("click", messageHandler)
        document.getElementById("chat-input-text").disabled = false;
    }
    conn.onerror = function(error) {
        console.error('WebSocket Error ' + error);
    }
    conn.onclose = function() {
        document.getElementById("send-chat").removeEventListener("click", messageHandler)
        document.getElementById("chat-input-text").disabled = true;
    }
    conn.onmessage = function(e) {
        if(e.data.startsWith("Error")) {
            infoDivToggle("error", 500, e.data)
            return;
        }
        var messages = JSON.parse(e.data)
        if(messages["type"] && messages["type"] == "old") {
            var sortedMsgs = messages['messages'].sort((a, b) =>  Date.parse(a.createdAt) - Date.parse(b.createdAt))
            for (var i = 0; i < sortedMsgs.length; i++) {
                if (sortedMsgs[i].creator.username != localStorage.getItem("currUser")) {
                    document.getElementById("chat-text").innerHTML += "<div id=chat-received>" + sortedMsgs[i].body + "</div>"
                } else {
                    document.getElementById("chat-text").innerHTML += "<div id=chat-sent>" + sortedMsgs[i].body + "</div>"
                }
            }
            document.getElementById("chat-text").scrollTop = document.getElementById("chat-text").scrollHeight
        } else {
            document.getElementById("chat-text").innerHTML += "<div id=chat-received>" + messages.body + "</div>"
            document.getElementById("chat-text").scrollTop = document.getElementById("chat-text").scrollHeight
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