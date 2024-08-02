# A Content Management System built as a Blog

## Built using Node JS, Express, MongoDB, Tinymce WYSIWYG editor etc

Install the dependencies:

`npm install`

Run the code on localhost, port 8080, ipv4:

`node index.js`

Seed the mongoDB cms/admins database using Mongosh (mongo shell), in order to create an admin login:

`mongo`  
`use cms`  
`db.admins.insertOne({value})`
