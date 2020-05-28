(function() {
    window.onload = function() {
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
        })*/
        checkSignedIn()
    }

    function toggleLandingPage(displays) {
        document.getElementById("signindiv").style.display = displays[0]
        document.getElementById("signupdiv").style.display = displays[1]
        document.getElementById("loggedindiv").style.display = displays[2]
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
                    toggleLandingPage(["block", "none", "none"])
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
                        friendList.innerHTML += friend.username
                        if (!friend.accepted) {
                            friendList.innerHTML += " Not acccepted<br>"
                        }
                    });

                    friendRequests.forEach(fr => {
                        div = document.createElement("DIV")
                        p = document.createElement("p")
                        p.innerHTML = fr.username
                        div.appendChild(p)
                        button = document.createElement("BUTTON")
                        button.id = "fr_" + fr.username + "button"
                        button.value = fr.username
                        button.innerHTML = "Accept Friend Request"
                        button.onclick = acceptFriend;

                        declineButton = document.createElement("BUTTON")
                        declineButton.id = "fr_decline_" + fr.username + "button" 
                        declineButton.value = fr.username
                        declineButton.innerHTML = "Decline Friend Request"
                        declineButton.onclick = declineFriend;

                        div.appendChild(button)
                        div.appendChild(declineButton)
                        friendRequestList.appendChild(div)
                    })
                    
                    console.log(friends)
                }
            }) 
            .catch((err) => console.log(err))
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

    

})()