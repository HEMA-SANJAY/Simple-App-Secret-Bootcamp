//jshint esversion:6
require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const e = require('express');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended : true}));

app.use(session({
    secret: "Our little secret",
    resave : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://0.0.0.0:27017/UserDB", {useNewUrlParser : true});

const userSchema = new mongoose.Schema( {
    email : String,
    password : String,
    googleId : String, 
    secret : String
});
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

passport.use(new LocalStrategy((username,password,done)=>{  
    try{
        User.findOne({email :username}).then(user=>{
            if (!user){
                return done(null,false, {message:"Incorrect Username"})
            }
            bcrypt.compare(password,user.password,function(err,result){ 
                if (err){
                    return done(err)
                }

                if (result) {
                    return done(null,user)
                }
                else {
                    return done (null,false, {message:"Incorrect Password"})
                }
            })

        })
    }
    catch (err){
            return done(err)
    }

}))

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

passport.deserializeUser(function(id, done) {
    console.log("Deserializing User")
    try {
        User.findById(id).then(user=>{
            done(null,user);
        })
    }
    catch (err){
        done(err);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));;

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if(err){
            console.log(err);
        } else {
            if(foundUsers){
                res.render("secrets", {userWithSecrets : foundUsers});
            }
        }
    })
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/logout", function(req, res){
    req.logout(function(err){
        if(err){
            console.log(err)
        }
        res.redirect("/");
    });
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        console.log("Not Authenticated");
        res.redirect("/");
    }
});

app.post("/submit", function(req, res){
    submittedSecret = req.body.secret;

    User.findById(req.user.id, function(err, foundResult){
        if(err){
            console.log(err);
        } else {
            if(foundResult){
                foundResult.secret = submittedSecret;
                foundResult.save(function(){
                    res.redirect("/secrets")
                });
            }
        }
    });
});

app.post("/register", function(req, res){
    bcrypt.hash(req.body.password, 10, function(err, hash) {
        if(err){
            console.log(err);
        }
        const newUser = new User({
            email : req.body.username,
            password : hash
        });
    
        newUser.save();
        passport.authenticate('local')(req,res,()=>{res.redirect("/secrets")}) ;
        
    });
});

app.post('/login', 
 passport.authenticate('local', 
 { successRedirect:"/secrets", failureRedirect: '/login' })
 );

app.listen(3000, function(err){
    if(!err){
        console.log("Server started at port 3000");
    }else{
        console.log(err);
    }
});
