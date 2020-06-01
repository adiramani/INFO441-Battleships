const mongoose = require("mongoose")
const express = require("express")
const morgan = require("morgan")
var mysql = require("mysql")
const {gameSchema} = require('./schemas')

const addr = process.env.ADDR || ":80"
const [host, port] = addr.split(":")
const mongoEndPoint = process.env.MONGOADDR
const mysqlEndPoint = process.env.MYSQLADDR.split(",")

const Game = mongoose.model("Game", gameSchema)

const app = express();
app.use(express.json());
app.use(morgan("dev"));

const mysqlPool = mysql.createPool({
    host: mysqlEndPoint[0],
    user: mysqlEndPoint[1],
    password: mysqlEndPoint[2],
    database: mysqlEndPoint[3],
    insecureAuth: true
});

const connect = () => {
    mongoose.connect(mongoEndPoint, {useNewUrlParser:true});
}
connect()
mongoose.connection.on('error', () => console.log("error connecting"))

app.listen(port, host, () => {
    console.log(`listening on ${port}`);
})

// helper function to query the db
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

// Create a new game
app.post("/game", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("No User ID provided");
        return;
    }

    const {public} = req.body;

    try {
        var row = await querySQL("SELECT username FROM user WHERE id=" + mysql.escape(userID))
        userName = ""
        if (row[0] && row[0].username) {
            userName = row[0].username
        } else {
            res.status(500).send("Unable to find username for creator")
            return;
        }
    } catch(e) {
        res.status(400).send("Error finding username")
    }

    players = [{"id":userID, "username":userName}]
    createdAt = new Date()
    const game = {
        "public": public,
        "players": players,
        "createdAt": createdAt,
    }
    const query = new Game(game);
    query.save((err, newGame) => {
        if (err) {
            res.status(400).send("Unable to create new game: "+ err.toString());
            return;
        }
        res.status(201).json(newGame);
        return;
    })
});


// Add another player to the game
app.patch("/game/:gameID", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const game = await Game.findOne({"id":req.params.gameID})
        if (!game) {
            res.status(400).send("The game requested does not exist.")
            return;
        }
        if (game['players'].length >= 2) {
            res.status(400).send("The game is already full")
        }

        var row = await querySQL("SELECT username FROM user WHERE id=" + mysql.escape(userID))
        userName = ""
        if(row[0] && row[0].username) {
            userName = row[0].username
        } else {
            res.status(500).send("Unable to find username for the user joining")
            return;
        }
        
        game.editedAt = new Date();
        game.players.push({"id":userID, "username":userName});

        game.save((err, updatedGame) => {
            if (err) {
                res.status(500).send("Unable to update the game" + err);
                return;
            }
            res.setHeader("Content-Type", "application/json");
            res.status(200).json(updatedGame);
            return;
        })
    } catch(e) {
        res.status(400).send("Error joining game")
        return
    }
});

// Get game information
app.get("/game/:gameID", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        res.setHeader("Content-Type", "application/json")
        const game = await Game.findOne({"id":req.params.gameID});
        if(!game) {
            res.status(400).send("The game requested does not exist.")
            return;
        }
        if (!game['players'].some(el => el.id == userID) && !game.public) {
            res.status(403).send("User not authorized to see the game.");
            return;
        }
        res.status(200).json(game);
        return;

    } catch (e) {
        res.status(500).send("Unable to get game information: " + e.toString());
        return;
    }
});


// Delete the game
app.delete("/game/:gameID", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const game = await Game.findOne({"id":req.params.gameID})
        if(!game) {
            res.status(400).send("The game does not exist.")
            return;
        }
        if (!game['players'].some(el => el.id == userID)) {
            res.status(403).send("User not authorized to delete this game");
            return;
        }

        await Game.deleteOne({"id":req.params.gameID}, function (err) {
            if (err) {
                res.status(500).send("Unable to delete the game");
                return;
            }
            res.setHeader("Content-Type", "text/plain");
            res.status(200).send("Game deleted successfully.");
        })
    } catch (e) {
        res.status(500).send("Unable to delete game: " + e.toString());
        return;
    }
})

