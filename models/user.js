const mongoose = require('mongoose')
const {Schema}=mongoose
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    birth:{
        type:Date,
        required:true
    },
    isClient:{
        type:Boolean,
        default:false
    },
    registered:{
        type:Date,
        default:Date.now
    },
    height:{
        type:Number,
        default:null
    },
    measure: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Measure'
        }
    ]
})

const User=mongoose.model('User',userSchema);
module.exports = User;