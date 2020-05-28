const mongoose = require("mongoose")
const express = require("express")
const morgan = require("morgan")
var mysql = require("mysql")

const addr = process.env.ADDR || ":80"
const [host, port] = addr.split(":")
const mysqlEndPoint = process.env.MYSQLADDR.split(",")

const app = express();
app.use(express.json());
app.use(morgan("dev"));

const mysqlPool = mysql.createPool({
    /*host: "localhost",
    user: "root",
    password: "password",
    database: "userDB",*/
    host: mysqlEndPoint[0],
    user: mysqlEndPoint[1],
    password: mysqlEndPoint[2],
    database: mysqlEndPoint[3],
    insecureAuth: true
});

/*const connect = () => {
    mongoose.connect(mongoEndPoint, {useNewUrlParser:true});
}
connect()
mongoose.connection.on('error', () => console.log("error connecting"))*/

app.listen(port, host, () => {
    console.log(`listening on ${port}`);
})

async function querySQL(query) {
    return new Promise(function (resolve, reject) {
        mysqlPool.query(query, async function (err, result, field) {
            if (err) {
                return reject(err)
            }
            resolve(result)
        })
    })
}

app.get("/v1/friends", async (req, res) => {
    if (!req.headers || !("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("No id passed in");
        return;
    }

    try {
        const friends = await querySQL("SELECT f.friendid, u.username, f.accepted FROM friends f JOIN user u ON u.id=f.friendid WHERE f.userid = " + mysql.escape(userID))
        const friendRequests = await querySQL("SELECT f.userid, u.username FROM friends f JOIN user u ON u.id=f.userid WHERE f.friendid = " + mysql.escape(userID) + " AND f.accepted = " + false)
        var returnDetails = {
            "friends": friends,
            "friendRequests": friendRequests
        }
        res.setHeader("Content-Type", "application/json")
        res.status(200).json(returnDetails)
    } catch(e) {
        res.status(500).send("Unable to find friends: " + e.toString())
    }
})

app.get("/v1/friends/:partialUser", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("No id passed in");
        return;
    }

    try {
        var input = req.params.partialUser
        const users = await querySQL("SELECT u.username FROM user u WHERE lower(u.username) LIKE " 
            + mysql.escape(input + "%") + " AND u.id != " + mysql.escape(userID))
        res.setHeader("Content-Type", "application/json")
        res.status(200).json(users)
    } catch(e) {
        res.status(500).send("Problem retrieving users: " + e.toString())
    }
})

app.post("/v1/friends/:friendUserName", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("No id passed in");
        return;
    }
    
    var {accepted, reject} = req.body
    if (accepted == null) {
        res.status(500).send("No accepted passed in - internal error")
        return
    } else {
        console.log(accepted)
    }

    try {
        const row = await querySQL("SELECT id FROM user WHERE username=" + mysql.escape(req.params.friendUserName))
        friendID = -1
        if (row[0] && row[0].id) {
            friendID = row[0].id
            if (friendID == userID) {
                res.status(403).send("Can't friend yourself")
                return;
            }
        } else {
            res.status(403).send("Unable to find friend")
            return;
        }

        // if they decline the friend request, delete it.
        if (reject) {
            await querySQL("DELETE FROM friends WHERE friendid=" + mysql.escape(userID) + " AND userid=" + 
                mysql.escape(friendID))
            res.status(200).send("Succesfully rejected friend request.")
            return;
        }

        // check to see if request already made
        const check = await querySQL("SELECT * FROM friends WHERE friendid=" + mysql.escape(friendID) + " AND userid=" +
            mysql.escape(userID))
        if (check[0]) {
            res.status(403).send("Already sent request to this user")
            return;
        }

        // check to see if this can be considered an acceptance
        const check2 = await querySQL("SELECT * FROM friends WHERE friendid=" + mysql.escape(userID) + " AND userid=" + 
            mysql.escape(friendID))
        if (check2[0]) {
            accepted = true;
        }

        await querySQL("INSERT INTO friends(userid, friendid, accepted) VALUES (" + mysql.escape(userID) + ", " 
        + mysql.escape(friendID) + ", " + mysql.escape(accepted) + ")")

        // if its an acceptence request, update the original request record
        if (accepted) {
            await querySQL("UPDATE friends SET accepted=" + mysql.escape(accepted) + " WHERE userid=" + mysql.escape(friendID) + " AND friendid = " 
        + mysql.escape(userID))
            res.status(201).send("Friend request accepted.")
            return;
        }
        res.status(201).send("Friend request sent.")
    } catch(e) {
        res.status(500).send("Unable to send request: " +  e.toString())
    }
})