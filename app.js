const express=require('express')
const app=express()
const BP=require('body-parser')
const ejs=require('ejs')
const path=require('path')
const mongoose=require('mongoose')
const session=require('express-session')
const dotenv=require('dotenv')

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({secret:'notasecret'}))


mongoose.connect('mongodb://localhost:27017/newtestbase', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!")
        console.log(err)
    })

app.listen(3000)

const Measure = require('./models/measure');
const User = require('./models/user');



app.get('/',(req,res)=>{
    res.redirect('/login')
})

app.get('/login',(req,res)=>{
    if(req.session.uid){
        res.redirect(`/${req.session.uid}`)
    }else{res.render('login')}
    
})

app.post('/login',async (req,res)=>{
    const {name,email,birth}=req.body
    const result=await User.findOne({name,email,birth})

    if(!result){
        res.send('Try again')
    }else{
        req.session.uid=result._id
        res.redirect(`/${req.session.uid}`)
    }
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.post('/register',async (req,res)=>{
    const {name,email,birth}=req.body

    const result=await User.findOne({name,email,birth})
    console.log(result)
    if(!result){
        
        const user=User({name,email,birth})
        user.save()
        res.redirect('/login')
    }else{
        res.render('register')
    }
})

app.get('/logout',(req,res)=>{
    req.session.uid=null
    res.redirect('/login')
})

app.get('/admin',async (req,res)=>{
    if(!req.session.uid){
        res.redirect('/login')
    }else{
        admin=await User.findById(req.session.uid)
        if(admin.email=='tutrai.gergo01@gmail.com'){
            req.session.isAdmin=true
            results=await User.find({})
            res.render('admin',{results})
        }else{
           res.redirect('/login')
        }
    

    }
})

app.get('/admin/:profile',async (req,res)=>{
    if(req.session.isAdmin){
        const userid=req.params.profile
        const result= await User.findById(userid).populate('measure')
        res.render('profile',{result})
    }else{
        res.redirect('/login')
    }
})

app.get('/:uid',async (req,res)=>{
    if(req.params.uid!==req.session.uid){
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






