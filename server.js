var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer  = require('multer');

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(express.static('public'));
app.use(bodyParser.json())

// Initialize MongoDB
const MongoClient = require('mongodb').MongoClient
var mongoDBUrl = 'mongodb://localhost/VendorDB';
// Create the database
MongoClient.connect(mongoDBUrl, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});
mongoDBUrl = 'mongodb://localhost/'
// Create the collection
MongoClient.connect(mongoDBUrl, function(err, database) {
  if (err) throw err;
  var db = database.db('VendorDB');
  db.createCollection("vendors", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
    database.close();
  });
});

//Uploaded files will be in folder "uploads"
var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null,  Date.now() + '_' + file.originalname);
  }
});
//The field name in HTML must be "file"
var upload = multer({ storage : storage}).single('file');

// Embedded javascript
app.set('view engine', 'ejs')

app.get('/list_vendor.html', function(req, res){
  res.sendFile( __dirname + "/" + "list_vendor.html" );
});

app.post('/searchVendors', urlencodedParser, function(req, res){
  try {
    var area = req.body.area;
    console.log("searchVendors="+area)
    MongoClient.connect(mongoDBUrl, function(err, database){
      if(err){
        console.log("Error connecting to DB: " + err);
        res.end('Failed to save the vendor details!');
        return;
      }
      console.log("Connectd to DB");
      var db = database.db('VendorDB');

  // Duplicate check : Check whether this company already exists or not
  //{working_area: {$regex: ".*"+area+".*"}}
      db.collection('vendors').find(
        {$or : [
          {working_area: {$regex: ".*"+area+".*", '$options':'i'}},
          {working_sub_area: {$regex: ".*"+area+".*", '$options':'i'}}
        ]}).toArray((err, result) => {
          // console.log("Search result: " + JSON.stringify(result));
        database.close();
        if (err){
          console.log(err)
          return "Failed!";
        }else{
          console.log("result="+result);
        }
        res.render('list_vendor.ejs', {vendors: result})
      })
    });
  } catch (err) {
    // handle the error safely
    console.log(err)
    return "Failed!";
  }
});

// The URL for page to save the vendor
app.get('/save_vendor.html', function (req, res) {
   res.render('save_vendor.ejs', null)
})
// The form ACTIOn for saving the vendor
app.post('/saveVendor', urlencodedParser, function(req, res){
  console.log("saveVendor : Request Body=");
  console.log(req.body);

  MongoClient.connect(mongoDBUrl, function(err, database){
    if(err){
      console.log("Error connecting to DB: " + err);
      res.end('Failed to save the vendor details!');
      return;
    }
    console.log("Connectd to DB");
    var db = database.db('VendorDB');

// Duplicate check : Check whether this company already exists or not
    db.collection('vendors').findOne({'company_name':req.body.company_name}, function(err, result){
      if(err){
        console.log("Error in seacrh: " + err);
        res.end('Failed to save the vendor details!');
        database.close();
        return;
      }else{
        console.log("findOne for " + req.body.company_name+" = "+result)
        if(result == null){
          console.log("Vendor doesn't exist, adding it");
          // Set the createion time for new vendor
          req.created_time = Date.now();
          // Set the last updated time
          req.last_updated_time = req.created_time;
          db.collection('vendors').save(req.body, (err, result) => {
            database.close();
            console.log("Saved the vendor: " + JSON.stringify(result));
            if (err) {
              console.log(err)
              res.end("Failed to save the vendor details!");
              return;
            }
            console.log('Vendor saved successfully')
            res.end('Vendor saved successfully');
            return;
          })
        }
        else{
          database.close();
          console.log("Vendor already exists");
          res.end('This vendor already exists!');
          return;
        }
      }
    } );
  });

} );

app.post('/file_upload', function (req, res) {
  upload(req,res,function(err) {
       if(err) {
           return res.end("Error uploading file." + err);
       }
       var count = req.files.length;
       var msg = "File is uploaded";
       if(count > 1)
          msg = count + " files are uploaded";
       res.end(msg);
   });
})

// Run the server on the port 8080 and listen to requests
var server = app.listen(8080, function () {
    var ip = require("ip");
   console.log("Example app listening at http://%s:8080/", ip.address())
   console.log("URL : http://%s:8080/save_vendor.html", ip.address())
   console.log("URL : http://%s:8080/list_vendor.html", ip.address())
})
