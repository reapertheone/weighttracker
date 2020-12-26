const mongoose = require('mongoose')
const {Schema}=mongoose

const measureSchema = new mongoose.Schema({
    date:{
        type:Date,
        default:Date.now

    },   
    weight:{
        type:Number,
        required:true
    },
    waist:{
        type:Number,
        required:true
    },
    hip:{
        type:Number,
        required:true
    },
    chest:{
        type:Number,
        required:true
    },
    rightArm:{
        type:Number,
        required:true
    },
    rightThigh:{
        type:Number,
        required:true
    },
    leftArm:{
        type:Number,
        required:true
    },
    leftThigh:{
        type:Number,
        required:true
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
})

const Measure=mongoose.model('Measure',measureSchema);
module.exports = Measure;
