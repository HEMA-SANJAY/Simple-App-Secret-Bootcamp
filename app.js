//jshint esversion:6
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://0.0.0.0:27017/UserDB", {useNewUrlParser : true});

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended : true}));

const userSchema = new mongoose.Schema( {
    email : String,
    password : String
});

const pass = "PasswordForEncryption";

userSchema.plugin(encrypt, {secret : pass, encryptedFields : ['password']});

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    res.render("secrets");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.post("/register", function(req, res){
    username = req.body.username;
    password = req.body.password;

    const newUser = new User({
        email : username,
        password : password
    });

    newUser.save();
    res.render("secrets");
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email : username})
    .then((foundresult) => {
        if(foundresult){
            if(foundresult.password === password){
                res.render("secrets");
            }else{
                res.send("Incorrect password");
            }
        }else{
            console.log("UserNotFound");
        }
    })
    .catch((err) => {
        console.log(err);
    });  
});

app.listen(3000, function(err){
    if(!err){
        console.log("Server started at port 3000");
    }else{
        console.log(err);
    }
});