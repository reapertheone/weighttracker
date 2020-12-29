const express=require('express')
const app=express()
const BP=require('body-parser')
const ejs=require('ejs')
const path=require('path')
const mongoose=require('mongoose')
const session=require('express-session')
const dotenv=require('dotenv').config()
const helmet=require('helmet')
const MongoDBStore = require('connect-mongodb-session')(session);

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/newtestbase';



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
    console.log("Database connected");
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

app.listen(process.env.PORT)

const Measure = require('./models/measure');
const User = require('./models/user');



app.get('/',(req,res)=>{
    res.redirect('/login')
})

app.get('/login',(req,res)=>{
    
   res.render('login')
    
})

app.post('/login',async (req,res)=>{
    const {name,email,birth}=req.body
    const result=await User.findOne({name,email,birth})

    if(!result){
        res.redirect('/login')
    }else{
        req.session.uid=result._id
        if(result.email==process.env.ADMIN){
            req.session.isAdmin=true
            
            res.redirect('/admin')
        }else if(!req.session.isAdmin&&req.session.uid){
            res.redirect(`/${req.session.uid}`)
        }else{
            res.redirect('/login')
        }
    }
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.post('/register',async (req,res)=>{
    const {name,email,birth}=req.body
    const emailResult=await User.findOne({email})
    const result=await User.findOne({name,email,birth})
    console.log(result)
    if(!result&&!emailResult){
        
        const user=User({name,email,birth})
        user.save()
        res.redirect('/login')
    }else{
        res.render('register')
    }
})

app.get('/logout',(req,res)=>{
    req.session.uid=null
    req.session.isAdmin=null
    res.redirect('/login')
})

app.get('/admin',async (req,res)=>{
    if(!req.session.uid){
        res.redirect('/login')
    }else{
        admin=await User.findById(req.session.uid)
        if(admin.email==process.env.ADMIN){
            req.session.isAdmin=true
            results=await User.find({})
            res.render('admin',{results})
        }else{
           res.redirect('/login')
        }
    

    }
})

app.get('/admin/clients',async (req,res)=>{
    if(req.session.isAdmin){
    results=await User.find({isClient:true})
    res.render('admin',results)}else{res.redirect('/login')}
})

app.get('/admin/:profile',async (req,res)=>{
    if(req.session.isAdmin){
        const userid=req.params.profile
        const result= await User.findById(userid).populate('measure')
        res.render('adminview',{result})
    }else{
        res.redirect('/login')
    }
})


app.post('/admin/:profile',async (req,res)=>{
    if(req.session.isAdmin){
        if(req.body.isClient){await User.findByIdAndUpdate(req.params.profile,{isClient:true})}else{await User.findByIdAndUpdate(req.params.profile,{isClient:false})}
        
        res.redirect(`/admin/${req.params.profile}`)
    }else{
        res.redirect('/login')
    }
})

app.get('/:uid',async (req,res)=>{
    if(req.params.uid!=req.session.uid){
        res.redirect('/login')
    }else{
    
    const result=await User.findById(req.session.uid).populate('measure')
    
    res.render('profile',{result})
    }
})

app.get('/:uid/:measureid',async (req,res)=>{
    result=await User.findOne({measure:req.params.measureid})
    if(!result){
        res.send('no data')
    }else{
        if(result._id==req.params.uid&&req.session.uid==req.params.uid||req.session.isAdmin){
            const measure=await Measure.findById(req.params.measureid)
            const user=await User.findById(req.params.uid)
            res.render('edit',{measure,user})
        }else{
            res.send('something went wrong')
        }
    }
})

app.post('/:uid/:measureid',async (req,res)=>{
    result=await User.findOne({measure:req.params.measureid})
    if(!result){
        res.send('no data')
    }else{
        if(result._id==req.params.uid&&req.session.uid==req.params.uid||req.session.isAdmin){
            const measure=await Measure.findByIdAndUpdate(req.params.measureid,req.body)
            res.redirect(`/${req.params.uid}`)
        }else{
            res.send('something went wrong')
        }
    }
})


app.get('/:uid/measures/new',async (req,res)=>{
    if(!req.session.uid){res.send('Smth went wrong')}else{

    const user=await User.findById(req.session.uid)


    res.render('new',{user})}
})

app.post('/:uid/measures/new',async (req,res)=>{
    if(req.session.uid){
    const {height,weight,waist,hip,chest,rightArm,rightThigh,leftArm,leftThigh}=req.body
    const user=await User.findById(req.params.uid)
    const measures=Measure({weight:weight,waist:waist,hip:hip,chest:chest,rightArm:rightArm,rightThigh:rightThigh,leftArm:leftArm,leftThigh:leftThigh})
    await measures.save()
    user.measure.push(measures)
    await user.save()
    res.redirect(`/${req.session.uid}`)}else{
        res.redirect('/login')
    }
})






