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

Channel.findOne({"name":"general"}, function (err, general) {
    console.log(general)
    if (err || !general) {
        const cA = Date.now()
        const genChannel = {
            "name": "general",
            "description": "general channel",
            "private":false,
            "createdAt": cA
        }
        const query = new Channel(genChannel);
        query.save((err) => {
            if (err) {
                console.log("Unable to create general channel")
                return;
            }
        })
    }
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
        const channels = await Channel.find().or([{"members.id":userID}, {"creator.id":userID}, {"private":false}, {"private":null}])
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
    try {
        row = await querySQL("SELECT email FROM user WHERE id=" + mysql.escape(userID))
    } catch(e) {
        res.status(500).send("Error finding user: " + e.toString())
        return;
    }
    userEmail = ""
    if(row[0] && row[0].email) {
        userEmail = row[0].email
    } else {
        res.status(500).send("Unable to find user")
        return;
    }

    const {name, description, private} = req.body;
    if (!name) {
        res.status(400).send("Required to have the name field")
        return;
    }
    user = {"id":userID, "email":userEmail}
    createdAt = new Date()
    const channel = {
        "name": name,
        "description": description,
        "private": private,
        "members": [user],
        "createdAt": createdAt,
        "creator": user
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

app.get("/v1/channels/:channelID", async (req, res) => {
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
        const channel = await Channel.findOne({"id":req.params.channelID});
        if(!channel) {
            res.status(400).send("Channel does not exist.")
            return;
        }
        if (!channel['members'].some(el => el.id == userID) && channel.private) {
            res.status(403).send("User not authorized to see channel.");
            return;
        }

        if (req.query.before) {
            const messages = await Message.find({"channelID":channel['id']}).where('id').lt(req.query.before).sort({"id":-1}).limit(100);
            res.json(messages);
        } else {
            const messages = await Message.find({"channelID":channel['id']}).sort({"id":-1}).limit(100);
            res.json(messages);
        }
    } catch (e) {
        res.status(500).send("Unable to get messages: " + e.toString());
        return;
    }
});

app.post("/v1/channels/:channelID", async (req, res) => {
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
});