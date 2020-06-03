const Schema = require('mongoose').Schema
const gameSchema = new Schema({
    id: {type:Schema.Types.ObjectId, required:true, unique:true, auto:true},
    public: {type:Boolean, required:true},
    available: {type:Boolean},
    players: {type:[{id:Number, username:String}]},
    createdAt: {type:Date, required:true},
    editedAt: Date,
})

module.exports = {gameSchema}