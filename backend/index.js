const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 8800
const multer = require('multer')
const path = require('path')
const csv = require('fast-csv')
const fs = require('fs'); 
const cors = require('cors')



const pool = require('./database');

app.use(bodyParser.urlencoded({extended: false}))

app.use(express.json())
app.use(cors())

// app.use(bodyParser.json())

// multer config-------------------

let storage = multer.diskStorage({
  destination:(req,file,callback) => {
    callback(null, "./uploads")
  },
  filename:(req,file,callback) => {
    callback(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname ))
  }
})

let upload = multer({
  storage:storage
})

// const csv = require('csv-parser');

// const inputFile='customer100.csv';


// fs.createReadStream(inputFile)
//     .pipe(csv())
//     .on('data', async function(data){
//         try {
//             console.log(`Name is: ${data.Company} ${data.City}`);

//             //perform the operation
            
//         }
//         catch(err) {
//             //error handler
//             console.log("some error occured");
//         }
//     })
//     .on('end', function()  {
//         //some final operation

        
//         console.log("parsing ended.........................................................................................||.||.");
//     });  




// app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  const sql = "SELECT id, name,email, contact FROM employee_data order by id asc limit 10";
    pool.query(sql , (err , data) => {
        if(err) return res.json("Error");
        return res.json(data);
    })
    // res.send('hi from backend')
    // res.sendFile(__dirname + "/index.html")
})

app.post('/add' , (req , res) => {
  const qry = "INSERT IGNORE INTO employee_data (`name`, `contact`, `email`) VALUES ?";
  const values = [
    [req.body.name,
    req.body.contact,
    req.body.email]
];
  pool.query(qry , [values], (err , data) => {
    if(err) return console.log(err);
    else {
      return res.json("Data uploaded successfully")
    }
  })
})

app.put('/update/:id' , (req , res) => {
  const qry = "update employee_data set `name` = ?, `email` = ?, `contact` = ? where `id` = ?";
  const values = [
    req.body.name,
    req.body.email,
    req.body.contact,
    ];
  const id = req.params.id;
  
  pool.query(qry , [...values, id], (err , data) => {
    if(err) return console.log(err);
    else {
      return res.json("Data uploaded successfully")
    }
  })
})

app.delete('/:id' , (req , res) => {
  const qry = "DELETE FROM employee_data WHERE `id` = ?";
  
  const id = req.params.id;
  pool.query(qry , [id], (err , data) => {
    if(err) return console.log(err);
    else {
      return res.json("Data deleted successfully")
    }
  })
})

app.get('/about', (req, res) => {
  res.send('Hi this is about me page')
})
app.post('/import-csv',upload.single('file'),(req,res) => {
  console.log(req.file.filename);
  uploadCsv(__dirname + "/uploads/" + req.file.filename)
  res.send("Your file uploaded successfully")

})

function uploadCsv(path) {
  let stream = fs.createReadStream(path)
  let csvDataColl = []
  let fileStream = csv
  .parse()
  .on('data', function(data) {
    csvDataColl.push(data)
  })
  .on('end' , function() {
    csvDataColl.shift()

    pool.getConnection((error, connection) => {
      if(error) {
        console.log(error)
      }
      else {
        let query = "INSERT IGNORE INTO employee_data (name, contact, email) VALUES ?"
        connection.query(query, [csvDataColl], (error, res) => {
          console.log(error || res)
        })

      }
    })
    fs.unlinkSync(path)
  })
  stream.pipe(fileStream)
}

app.listen(port, () => {
  console.log(`app running at http://localhost:${port}`)
  pool.getConnection(function(err) {
    if(err) throw err;
    console.log('Database connected');
  })
})
