const express = require("express");
const app = express();
// const fs = require('fs');
// let bodyParser = require('body-parser')
// let jsonParser = bodyParser.json()

const port = 3000;

app.use(express.static("public"));

app.get("/", function (req, res) {
    res.send("Hi!");
})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
