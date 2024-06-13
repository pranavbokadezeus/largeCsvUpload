const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 8800
const multer = require('multer')
const path = require('path')
const csv = require('fast-csv')
const fs = require('fs'); 
const cors = require('cors')
const retry = require('retry'); 


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
  const sql = "SELECT id, name,email, contact FROM employee_data order by id asc";
    pool.query(sql , (err , data) => {
        if(err) return res.json("Error");
        return res.json(data);
    })
    // res.send('hi from backend')
    // res.sendFile(__dirname + "/index.html")
})

// ------------------------------------------


app.post('/add' ,async (req , res) => {
  
  const qry = "REPLACE INTO employee_data (`name`, `contact`, `email`) VALUES ?";
  const values = [
    [req.body.name,
    req.body.contact,
    req.body.email]
];
  await pool.query(qry , [values], (err , data) => {
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

    const retryCount = 5;

    attemptUpload(1);

  function attemptUpload(attempt) {

    pool.getConnection(async (error, connection) => {
      if(error) {
        
        if (attempt <= retryCount) {
          console.log(`Retry attempt ${attempt} due to connection error...`);
          attemptUpload(attempt + 1);
        } else {
          console.log(error)
        }
      }
      else {
        
        connection.beginTransaction((err) => {
          if(err) {
            if (attempt <= retryCount) {
              console.log(`Retry attempt ${attempt} due to connection error...`);
              attemptUpload(attempt + 1);
            }else {
            return res.status(400).json({
              message: "Error Occured"
            })
          }
          }
          let query = "INSERT IGNORE INTO employee_data (name, contact, email) VALUES ?"
            connection.query(query, [csvDataColl], (error, res) => {
              // console.log(error || res)
              if (error && error.code === 'ER_LOCK_DEADLOCK' && attempt <= retryCount) {
                console.log(`Retry attempt ${attempt} due to deadlock...`);
                connection.release();
                attemptUpload(attempt + 1);
                return;
              }
            });
            
        })
        connection.commit(function(err) {
          if(err) {
            return connection.rollback(function() {
              throw err;
            })
          }
          console.log("success");
        });
          connection.release();
      }
    })

  }
    fs.unlinkSync(path)
  })
  stream.pipe(fileStream)
}

// --------------------------------------------------------------------------------------

// function uploadCsv(path, retryCount = 5) {
//   let stream = fs.createReadStream(path);
//   let csvDataColl = [];

//   let fileStream = csv
//     .parse()
//     .on('data', function(data) {
//       csvDataColl.push(data);
//     })
//     .on('end' , function() {
//       csvDataColl.shift(); // Assuming this removes the header row

//       attemptUpload(1);

//       function attemptUpload(attempt) {
//         pool.getConnection(async (error, connection) => {
//           if (error) {
//             console.log(error);
//             // Handle error, optionally retry or delete file
//             if (attempt <= retryCount) {
//               console.log(`Retry attempt ${attempt} due to connection error...`);
//               attemptUpload(attempt + 1);
//             } else {
//               // Optionally delete the file on failure
//               fs.unlinkSync(path);
//             }
//             return;
//           }

//           let query = "REPLACE INTO employee_data (name, contact, email) VALUES ?";
//           connection.query(query, [csvDataColl], (error, res) => {
//             if (error && error.code === 'ER_LOCK_DEADLOCK' && attempt <= retryCount) {
//               console.log(`Retry attempt ${attempt} due to deadlock...`);
//               connection.release();
//               attemptUpload(attempt + 1);
//               return;
//             }

//             if (error) {
//               console.log(error);
//               // Handle other database query errors, optionally delete file
//             } else {
//               console.log(res); // Logging successful database operation result
//             }
            
//             // Release connection back to pool
//             connection.release();

//             // Delete the file after database operation completes
//             fs.unlink(path, (err) => {
//               if (err) {
//                 console.log(err);
//                 // Handle file deletion error
//               } else {
//                 console.log(`Deleted file: ${path}`);
//               }
//             });
//           });
//         });
//       }
//     });

//   stream.pipe(fileStream);
// }

// ---------------------------------------------------------------------------------------


app.listen(port, () => {
  console.log(`app running at http://localhost:${port}`)
  pool.getConnection(function(err) {
    if(err) throw err;
    console.log('Database connected');
  })
})
