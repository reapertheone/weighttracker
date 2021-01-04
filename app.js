const express = require('express')
const app = express()
const BP = require('body-parser')
const ejs = require('ejs')
const path = require('path')
const mongoose = require('mongoose')
const session = require('express-session')
const fs=require('fs')
const helmet = require('helmet')
const MongoDBStore = require('connect-mongo')(session);
//const dotenv=require('dotenv').config()
const dbUrl = process.env.DB_URL||"mongodb://localhost:27017/newtestbase";




app.use(helmet())
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');



mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log(`Database connected to ${dbUrl}`);
});


const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
const port = process.env.PORT || 3000
app.listen(port)

const Measure = require('./models/measure');
const User = require('./models/user');



app.get('/', async (req, res) => {
    const result=await User.findOne({})
    if(!result){
        res.render('register')
    }else{
    
    res.redirect('/login')}
})

app.get('/login', (req, res) => {
   
    if(req.session.message){
    const message=req.session.message
    res.render('login',{message})
    }else{
        req.session.message={body:false,status:false}
        const message=req.session.message

        res.render('login',{message})   
    }

})

app.post('/login', async (req, res) => {
    req.session.message={body:false,status:false}
    const { name, email, birth } = req.body
    const result = await User.findOne({ name, email, birth })
    

    if (!result) {
        res.redirect('/login')
        console.log(result)
        console.log(secret)
    } else {
        console.log(req.session.isAdmin)
        req.session.isAdmin=result.isAdmin
        req.session.uid=result._id

        if(req.session.isAdmin){
            console.log('baj')
            res.redirect('/admin')
        }else{
            res.redirect(`/${req.session.uid}`)
        }
    }
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async (req, res) => {
    const { name, email, birth, height } = req.body
    const firstUser=await User.findOne({})
    const emailResult = await User.findOne({ email })
    const result = await User.findOne({ name, email, birth })
    console.log(emailResult)
    if(!firstUser){
        const user = User({ name, email, birth, height,isAdmin:true })
        user.save()
        res.redirect('/login')
    }else{
        if (!result && !emailResult) {

             const user = User({ name, email, birth, height })
             user.save()
             req.session.message={body:"Succes! You can log in now",status:"success"}
             
             res.redirect('/login')
        } else {
            req.session.message={body:"Email or User is already registered",status:"danger"}
            
             res.redirect('/login')
    }}
})

app.get('/logout', (req, res) => {
    req.session.uid = null
    req.session.isAdmin = null
    res.redirect('/login')
})

app.get('/admin', async (req, res) => {
    if (!req.session.uid) {
        res.redirect('/login')
    } else {
        if(req.session.isAdmin){results = await User.find({})
        res.render('admin', { results })}else{
            res.redirect('/login')
        }
        
            
        


    }
})

app.post('/admins/all/search', async (req, res) => {
    if (req.session.isAdmin) {
        let results = await User.find({ name: new RegExp(req.body.search, "i") })
        res.render('admin', { results })
    }
})


app.get('/admin/clients', async (req, res) => {
    if (req.session.isAdmin) {
        results = await User.find({ isClient: true })
        res.render('admin', results)
    } else { res.redirect('/login') }
})

app.get('/admin/export',async (req,res)=>{
    if(req.session.isAdmin){
    const users = await User.find({isClient:true}).populate('measure')
    
    res.render('export',{users})
    }else{
        req.session.message={body:"You don't have permission",status:"danger"}
        res.redirect('/login')
        
    }
    
})

app.get('/admin/:uid/measures/new', async (req, res) => {
    if (!req.session.uid) { res.send('Smth went wrong') } else {
        isAdmin=req.session.isAdmin
        const user = await User.findById(req.params.uid)


        res.render('new', { user,isAdmin })
    }
})

app.post('/admin/:uid/measures/new', async (req, res) => {
    if (req.session.isAdmin) {
        const {weight, waist, hip, chest, rightArm, rightThigh, leftArm, leftThigh, comment} = req.body
        const user = await User.findById(req.params.uid)
        const measures = Measure({ weight: weight, waist: waist, hip: hip, chest: chest, rightArm: rightArm, rightThigh: rightThigh, leftArm: leftArm, leftThigh: leftThigh,comment:comment})
        await measures.save()
        user.measure.push(measures)
        await user.save()
        res.redirect(`/admin/${req.params.uid}`)
    } else {
        res.redirect('/login')
    }
})

app.get('/admin/:profile', async (req, res) => {
    if (req.session.isAdmin) {
        const userid = req.params.profile
        const user = await User.findById(userid).populate('measure')
        res.render('newadminview', { user })
        //res.send({user,userid})
        
    } else {
        res.redirect('/login')
    }
})


app.post('/admin/:profile', async (req, res) => {
    if (req.session.isAdmin) {
        if (req.body.isClient) { await User.findByIdAndUpdate(req.params.profile, { isClient: true }) } else { await User.findByIdAndUpdate(req.params.profile, { isClient: false }) }

        res.redirect(`/admin/${req.params.profile}`)
    } else {
        res.redirect('/login')
    }
})

app.get('/:uid', async (req, res) => {
    if (req.params.uid != req.session.uid) {
        res.redirect('/login')
    } else {

        const user = await User.findById(req.session.uid).populate('measure')

        res.render('profile1', { user })
    }
})

app.get('/:uid/:measureid', async (req, res) => {
    result = await User.findOne({ measure: req.params.measureid })
    if (!result) {
        res.send('no data')
    } else {
        if (result._id == req.params.uid && req.session.uid == req.params.uid || req.session.isAdmin) {
            const measure = await Measure.findById(req.params.measureid)
            const user = await User.findById(req.params.uid)
            if(req.session.isAdmin){

                res.render('adminedit', { measure, user })
            }else{res.render('edit', { measure, user })}

        } else {
            res.send('something went wrong')
        }
    }
})

app.post('/:uid/:measureid', async (req, res) => {
    const measureSearch=await Measure.findById(req.params.measureid)
    if(measureSearch){
        const measureUpdate=await Measure.findByIdAndUpdate(req.params.measureid,req.body)
        const measure=await Measure.findById(req.params.measureid)
        const user=User.findOne({'measure':req.params.measureid})
        if(req.session.isAdmin){
        res.redirect(`/admin/${req.params.uid}`)
        }else{
            res.redirect(`/${req.params.uid}`)
        }
    }else{
        res.send('No Data')
    }
})


app.get('/:uid/measures/new', async (req, res) => {
    if (!req.session.uid) { res.send('Smth went wrong') } else {
        const isAdmin=req.session.isAdmin
        const user = await User.findById(req.params.uid)


        res.render('new', { user,isAdmin })
    }
})

app.post('/:uid/measures/new', async (req, res) => {
    if (req.session.uid) {
        const {weight, waist, hip, chest, rightArm, rightThigh, leftArm, leftThigh } = req.body
        const user = await User.findById(req.params.uid)
        const measures = Measure({ weight: weight, waist: waist, hip: hip, chest: chest, rightArm: rightArm, rightThigh: rightThigh, leftArm: leftArm, leftThigh: leftThigh })
        await measures.save()
        user.measure.push(measures)
        await user.save()
        if(req.session.isAdmin){
            res.redirect(`/admin/${req.session.uid}`) 
        }else{
        res.redirect(`/${req.session.uid}`)
        }
    } else {
        res.redirect('/login')
    }
})








