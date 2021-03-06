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
        document.getElementById("addfriendbutton").addEventListener("click", addFriend)
        document.getElementById("updateFriendsList").addEventListener("click", getFriends)
        document.getElementById("addfriendinput").addEventListener("input", autocompleteFriends)
        document.getElementById("addfriendinput").addEventListener("focusout", function(e) {
            if (document.activeElement.className != "autocomplete-list-items") {
                removeAutocomplete()
            }
        })
        checkSignedIn();
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
        var email = document.getElementById("signin_email").value
        var password = document.getElementById("signin_password").value
        document.getElementById("signin_email").value = ""
        document.getElementById("signin_password").value = ""

        var details = {"email":email, "password":password}
        fetch("https://api.dr4gonhouse.me/v1/sessions", {
            method: "POST",
            headers: {
                'Content-Type': "application/json"
            },
            body: JSON.stringify(details)
        })
            .then(async (response) => {
                if(response.status > 300) {
                    var text = await response.text()
                    infoDivToggle("error", response.status, text)
                } else {
                    response.headers.forEach((value, key) => {
                        if (key == "content-type") {
                            if (value != "application/json") {
                            }
                        } else if (key == "authorization") {
                            window.localStorage.setItem(key, value)
                        }
                    });
                    var newResponse = await response.json()
                    localStorage.setItem("currUser", newResponse.userName)
                    toggleLandingPage(["none", "none", "block"])
                    getFriends()
                }
            })
            .catch((err) => console.log(err))
    }

    function signOut() {
        infoDivToggle("reset", null, null)
        var token = window.localStorage.getItem("authorization")
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
                    document.getElementById("friendslist").innerHTML = ""
                    document.getElementById("friendrequestlist").innerHTML = ""
                    document.getElementById("chat-text").innerHTML = ""
                    document.getElementById("chat-header").innerHTML = ""
                    document.getElementById("chat-input-text").value = ""
                    toggleLandingPage(["block", "none", "none"])
                    if(openConn) {
                        openConn.close()
                    }
                    localStorage.removeItem("authorization")
                    localStorage.removeItem("currUser")
                    infoDivToggle("success", response.status, "Signed Out")
                    location.reload()
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
                                infoDivToggle("error", 500, "Error in response")
                            }
                        } else if (key == "authorization") {
                            window.localStorage.setItem(key, value)
                        }
                    });
                    var newResponse = await response.json()
                    localStorage.setItem("currUser", newResponse.userName)
                    toggleLandingPage(["none", "none", "block"])
                }
            })
            .catch((err) => console.log(err))
    }
})()
