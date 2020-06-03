const mongoose = require("mongoose")
const express = require("express")
const morgan = require("morgan")
var mysql = require("mysql")
const {channelSchema, messageSchema} = require('./schemas')

const addr = process.env.ADDR || ":80"
const [host, port] = addr.split(":")
const mongoEndPoint = process.env.MONGOADDR
const mysqlEndPoint = process.env.MYSQLADDR.split(",")

const Channel = mongoose.model("Channel", channelSchema)
const Message = mongoose.model("Message", messageSchema)

const app = express();
app.use(express.json());
app.use(morgan("dev"));
var expressWs = require('express-ws')(app);

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

app.get("/v1/channels", async (req, res) => {
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
        res.setHeader("Content-Type", "application/json")
        var val = req.query.friendID
        if (val) {
            channels = await Channel.find().and([{"members.id":val}, {"members.id":userID}])
        } else {
            channels = await Channel.find().or([{"members.id":userID}, {"creator.id":userID}, {"private":false}, {"private":null}])
        }
        res.json(channels)
    } catch (e) {
        res.status(500).send("Unable to find any channels")
        return;
    }
});

app.post("/v1/channels", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("No id passed in");
        return;
    }

    const {name, description, private, otherUserName} = req.body;
    if (!name || !otherUserName) {
        res.status(400).send("Required to have the name or otherUserID field")
        return;
    }

    try {
        var row = await querySQL("SELECT id FROM user WHERE username=" + mysql.escape(otherUserName))
        var row2 = await querySQL("SELECT username FROM user WHERE id=" + mysql.escape(userID))
        otherUserID = ""
        userName = ""
        if(row[0] && row[0].id) {
            otherUserID = row[0].id
        } else {
            res.status(400).send("Unable to find friend id")
            return;
        }
        if(row2[0] && row2[0].username) {
            userName = row2[0].username
        } else {
            res.status(500).send("Unable to find username")
            return;
        }
    } catch(e) {
        res.status(400).send("Error finding username")
    }

    users = [{"id":userID, "username":userName}, {"id": otherUserID, "username":otherUserName}]
    createdAt = new Date()
    const channel = {
        "name": name,
        "description": description,
        "private": private,
        "members": users,
        "createdAt": createdAt,
        "creator": users[0]
    }
    const query = new Channel(channel);
    query.save((err, newChannel) => {
        if (err) {
            res.status(400).send("Unable to create new channel: "+ err.toString());
            return;
        }
        res.status(201).json(newChannel);
        return;
    })
});

var connections = []

app.ws('/v1/channels/:channelID/message', async function(ws, req) {
    // error handling
    if (!("x-user" in req.headers)) {
        ws.send("Error: User not authenticated");
        return;
    }
    const {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        ws.send("Error: User not authenticated");
        return;
    }

    const channel = await Channel.findOne({"id":req.params.channelID});
    if(!channel) {
        ws.send("Error: Channel does not exist.")
        return;
    }
    if (!channel['members'].some(el => el.id == userID) && channel.private) {
        ws.send("Error: User not authorized to see channel.");
        return;
    }

    details = {"ws":ws, "channelID": req.params.channelID, "userID":userID}

    connections.push(details)
    console.log("New connection for channel " + req.params.channelID)

    try {
        const messages = await Message.find({"channelID":req.params.channelID}).sort({"id":-1}).limit(100);
        var oldMessages = {"type":"old", "messages":messages}
        ws.send(JSON.stringify(oldMessages));
    } catch(e) {
        console.log("Error: Messaging websocket error: " + e.toString())
    }

    ws.on("close", function() {
        console.log("Connection closed for " + req.params.channelID)
        var index = 0
        connections.forEach((connection) => {
            if (connection.channelID == req.params.channelID && connection.userID != userID) {
                return;
            }
            index++;
        })
        connections.splice(index)
    })

    ws.on('message', async function(msg) {
        console.log("Recieved message: " + msg)
        sent = false
        createdAt = new Date();

        try {
            var row = await querySQL("SELECT username FROM user WHERE id=" + mysql.escape(userID))
            userName = ""
            if(row[0] && row[0].username) {
                userName = row[0].username
            } else {
                ws.send("Error: Unable to find username")
                return;
            }
        } catch(e) {
            ws.send("Error: something wrong finding username")
            return;
        }
        const message = {
            "channelID": req.params.channelID,
            "body": msg,
            "createdAt": createdAt,
            "creator": {"id":userID, "username":userName},
        }
        connections.forEach((connection) => {
            if (connection.channelID == req.params.channelID && connection.userID != userID) {
                const query = Message(message)
                if(connection.ws.readyState == 1) {
                    query.save((err, message) => {
                        if (err) {
                            ws.send("Unable to send new message" + err);
                            return;
                        }
                        connection.ws.send(JSON.stringify(message))
                        return;
                    })
                    sent = true
                }
            }
        })
        if(!sent) {
            try {
                const query = Message(message)
                query.save((err, message) => {
                    if (err) {
                        ws.send("Error: Unable to send new message" + err);
                        return;
                    }
                })
            } catch(e) {
                console.log("Messaging websocket error: " + e.toString())
            }
        }
    })

    ws.on("error", function(err) {
        console.log(err)
    })
})

/*app.post("/v1/channels/:channelID", async (req, res) => {
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
        row = await querySQL("SELECT email FROM user WHERE id=" + mysql.escape(userID))
        userEmail = ""
        if(row[0] && row[0].email) {
            userEmail = row[0].email
        } else {
            res.status(500).send("Unable to find user")
            return;
        }

        const channel = await Channel.findOne({"id":req.params.channelID});
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (!channel['members'].some(el => el.id == userID) && channel.private) {
            res.status(403).send("User not authorized to see channel.");
            return;
        }

        const {body} = req.body;
        if (!body) {
            res.status(400).send("Cannot sent an empy message");
            return;
        }
        createdAt = new Date();


        const message = {
            "channelID": channel['id'],
            "body": body,
            "createdAt": createdAt,
            "creator": {"id":userID, "email":userEmail},
        } 
        const query = Message(message)
        query.save((err, newMessage) => {
            if (err) {
                res.status(400).send("Unable to create new message" + err);
                return;
            }
            res.setHeader("Content-Type", "application/json");
            res.status(201).json(newMessage);
            return;
        })
    } catch (e) {
        res.status(500).send("Unable to send a message: " + e.toString());
    }
});

app.patch("/v1/channels/:channelID", async (req, res) => {
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
        const channel = await Channel.findOne({"id":req.params.channelID})
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (channel['creator']['id'] != userID) {
            res.status(403).send("User not authorized to update channel.");
            return;
        }

        const {name, description} = req.body;
        if (!name && !description) {
            res.status(400).send("Invalid update params");
            return;
        }
        channel.editedAt = new Date();

        if (name) {
            channel.name = name;
        }
        if (description) {
            channel.description = description;
        }

        channel.save((err, updatedChannel) => {
            if (err) {
                res.status(500).send("Unable to update channel" + err);
                return;
            }
            res.setHeader("Content-Type", "application/json");
            res.status(200).json(updatedChannel);
            return;
        })
    } catch (e) {
        res.status(500).send("Unable to edit channel: " + e.toString());
        return;
    }
})

app.delete("/v1/channels/:channelID", async (req, res) => {
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
        const channel = await Channel.findOne({"id":req.params.channelID})
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (channel['creator']['id'] != userID) {
            res.status(403).send("User not authorized to delete channel.");
            return;
        }

        await Message.deleteMany({"channelID":req.params.channelID}, function (err) {
            if (err) {
                res.status(500).send("Unable to delete messages");
                return;
            }
        })

        await Channel.deleteOne({"id":req.params.channelID}, function (err) {
            if (err) {
                res.status(500).send("Unable to delete channel");
                return;
            }
            res.setHeader("Content-Type", "text/plain");
            res.status(200).send("Channel deleted successfully.");
        })
    } catch (e) {
        res.status(500).send("Unable to delete channel: " + e.toString());
        return;
    }
})

app.post("/v1/channels/:channelID/members", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    var {userID} = JSON.parse(req.headers['x-user']);
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const channel = await Channel.findOne({"id":req.params.channelID})
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (channel['creator']['id'] != userID) {
            res.status(403).send("User not authorized to add members to the channel.");
            return;
        }
        const {id} = req.body;
        row = await querySQL("SELECT email FROM user WHERE id=" + mysql.escape(id))
        newUserEmail = ""
        if(row[0] && row[0].email) {
            newUserEmail = row[0].email
        } else {
            res.status(500).send("Unable to find user")
            return;
        }

        channel.members.push({"id":id, "email":newUserEmail})
        channel.save((err) => {
            if (err) {
                res.status(500).send("Unable to add member to channel");
                return;
            }
            res.setHeader("Content-Type", "text/plain");
            res.status(201).send("User added to member list");
        })
    } catch (e) {
        res.status(500).send("Unable to add member to channel: " + e.toString());
        return;
    }
});

app.delete("/v1/channels/:channelID/members", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    var {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const channel = await Channel.findOne({"id":req.params.channelID})
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (channel['creator']['id'] != userID) {
            res.status(403).send("User not authorized to remove members from the channel.");
            return;
        }

        const {id} = req.body;

        newMembers = [];
        for (index in channel.members) {
            if (channel.members[index].id != id) {
                newMembers.push(channel.members[index])
            }
        }

        channel.members = newMembers;
        channel.save((err) => {
            if (err) {
                res.status(500).send("Unable to remove member from channel: " + err.toString());
                return;
            }
            res.setHeader("Content-Type", "text/plain");
            res.status(200).send("User removed from member list");
        })
    } catch (e) {
        res.status(500).send("Unable to delete member from channel: " + e.toString());
        return;
    }
});

app.patch("/v1/messages/:messageID", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    var {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const message = await Message.findOne({"id":req.params.messageID})
        if(!message) {
            res.status(400).send("Message does not exist.")
            return;
        }
        if (message.creator.id != userID) {
            res.status(403).send("User did not send message");
            return;
        }
        const {body} = req.body
        if (!body) {
            res.status(400).send("Invalid message body. Cannot be empty");
            return;
        }
        message.editedAt = new Date();
        message.body = body
        message.save((err, newMessage) => {
            if (err) {
                res.status(500).send("Unable to udpate message");
                return;
            }
            res.setHeader("Content-Type", "application/json");
            res.status(200).json(newMessage);
        })
    } catch(e) {
        res.status(500).send("Unable to update message: " + e.toString());
        return;
    }
});

app.delete("/v1/messages/:messageID", async (req, res) => {
    if (!("x-user" in req.headers)) {
        res.status(403).send("User not authenticated");
        return;
    }
    var {userID} = JSON.parse(req.headers['x-user'])
    if (!userID) {
        res.status(403).send("User not authenticated");
        return;
    }

    try {
        const message = await Message.findOne({"id":req.params.messageID})
        if(!message) {
            res.status(400).send("Message does not exist.")
            return;
        }
        if (message.creator.id != userID) {
            res.status(403).send("User did not send message");
            return;
        }
        
        await Message.deleteOne({"id":req.params.messageID}, function (err) {
            if (err) {
                res.status(500).send("Unable to delete message");
                return;
            }
            res.setHeader("Content-Type", "text/plain");
            res.status(200).send("Successfully deleted message");
        })
    } catch(e) {
        res.status(500).send("Unable to delete message: " + e.toString())
        return;
    }
});*/