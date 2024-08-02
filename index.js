// import dependencies you will use
const express = require('express');
const path = require('path');
//setting up Express Validator
const {check, validationResult, body} = require('express-validator'); // ES6 standard for destructuring an object
const fileUpload = require('express-fileupload');
// set up the DB connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cms', {
    family: 4
})
//.then(db => (console.log('db is connected')))

// get expression session
const session = require('express-session');

// define the page model
const Page = mongoose.model('Page', {
    pageTitle: String,
    slug: String,
    pageImageName: String,
    pageContent: String
})

// set up the model for admin
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

// set up variables to use packages
var myApp = express();
myApp.use(express.urlencoded({extended:false}));

// set up session
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// set path to public folders and view folders

myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
myApp.use(fileUpload());

// set up different routes (pages) of the website


//home page
myApp.get('/', async function(req, res){
    const homePage = await Page.findOne({slug: 'home'}).exec()
    const allPages = await Page.find({}).exec()
    if (homePage !== null) {
        res.redirect('/nav/home')
    } else {
        res.render('home', {pages: allPages})
    }
});

myApp.get('/admin', function(req, res) {
    if (req.session.userLoggedIn){
        res.render('admin', {admin: req.session.username})
    } else {
        res.redirect('/admin/login')
    }
})

myApp.get('/admin/allpages', (req, res) => {
    if (req.session.userLoggedIn) {
        Page.find({}).exec()
        .then((pages) => {
            res.render('admin/allpages', {pages: pages, admin: req.session.username})
        })
    } else {
        res.redirect('/admin/login')
    }
})

myApp.get('/admin/login', function(req, res){
    Page.find({}).exec()
    .then((pages_) => {
        res.render('admin/login', {pages: pages_});
    })
});

myApp.get('/admin/add', function(req, res){
    if (req.session.userLoggedIn) {
        res.render('admin/add', {admin: req.session.username});
    } else {
        res.redirect('/admin/login')
    }
});


myApp.post('/admin/add', [
    check('pageTitle', "Must Have a Title").not().isEmpty(),
    check('slug', "Must Have a Slug. Hint: Simply Use the Title").not().isEmpty(),
    body().custom((value, { req }) => {
    if (!req.files || !req.files.pageImageName) {
        throw new Error('Must have an Image!');
    }
    return true;
    }),
    check('pageContent', 'Must have a Content').not().isEmpty()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // console.log('Add Page Errors: ',errors)
        res.render('admin/add', {errors: errors.array(), admin: req.session.username})
    } else {
        const pageTitle = req.body.pageTitle
        const pageContent = req.body.pageContent
        const slug = req.body.slug
        const pageImageName = req.files.pageImageName.name
        const pageImageFile = req.files.pageImageName
        const pageImagePath = `public/uploads/${pageImageName}`

        pageImageFile.mv(pageImagePath, err => {
            console.log(err === undefined ? 'image moved successsfully' : `${err}: Image not moved`)
        })

        const pageData = {
            pageTitle: pageTitle,
            slug: slug.toLowerCase(),
            pageImageName: pageImageName,
            pageContent: pageContent
        }

        const newPage = new Page(pageData)
        // console.log('New Page Added')
        newPage.save()
        .then(() => {
            res.render('admin', {message: 'You have successfully created a new page', admin: req.session.username});
        })
    }
})


// login form post
myApp.post('/admin/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;

    //console.log(username);
    //console.log(password);
    Admin.findOne({username: user, password: pass}).exec()
    .then(function(admin){
        // log any errors
        // console.log('Admin: ' + admin);
        
        //store username in session and set logged in true
        req.session.username = admin.username;
        req.session.userLoggedIn = true;
        // redirect to the dashboard
        res.redirect('/admin');        
    })
    .catch(err => {
        Page.find({}).exec()
        .then((pages) => {
            res.render('admin/login', {error: ['Sorry, cannot login!, Kindly enter a valid Username and Password', 'error'], pages: pages});
        })
    })

});

myApp.get('/admin/logout', function(req, res){
    req.session.username = '';
    req.session.userLoggedIn = false;
    Page.find({}).exec()
    .then((pages) => {
        res.render('admin/login', {error: ['Successfully logged out', 'success'], pages: pages});
    })
});

myApp.get('/admin/edit/:slug', (req, res) => {
    if (req.session.userLoggedIn) {
        const pageId = req.params.slug
        Page.findOne({slug: pageId}).exec()
        .then((page) => res.render('admin/edit', {page: page, admin: req.session.username}))
        .catch(() => res.send('No page found with that Id...'))
    } else {
        Page.find({}).exec()
        .then((pages) => {
            res.redirect('/admin/login')
        })
    }
})

myApp.post('/admin/edit/:slug', [
    check('pageTitle', "Must Have a Title").not().isEmpty(),
    check('slug', "Must Have a Slug. Hint: Simply Use the Title").not().isEmpty(),
    check('pageContent', 'Must have a Content').not().isEmpty()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const pageId = req.params.slug
        Page.findOne({slug: pageId}).exec()
        .then(page => res.render('admin/edit', {page: page, errors: errors.array()}))
        .catch(() => res.send('No Page with that Link...'))

    } else {
        const pageTitle = req.body.pageTitle
        const pageContent = req.body.pageContent
        const slug = req.body.slug

        let pageImage_name = req.body.previousImage
        // console.log('previous image name:', pageImage_name)

        if (req.files && req.files.pageImageName !== null) {
            pageImage_name = req.files.pageImageName.name
            const pageImageFile = req.files.pageImageName
            const pageImagePath = `public/uploads/${pageImage_name}`
            
            pageImageFile.mv(pageImagePath, err => {
                console.log(err === undefined ? 'image moved successsfully' : `${err}: Image not moved`)
            })
        }

        const pageData = {
            pageTitle: pageTitle,
            slug: slug.toLowerCase(),
            pageImageName: pageImage_name,
            pageContent: pageContent
        }

        Page.findOne({slug: slug})
        .then((page) => {
            page.pageTitle = pageTitle,
            page.slug = slug.toLowerCase(),
            page.pageImageName = pageImage_name,
            page.pageContent = pageContent
            page.save()
        })
        .then(() => {
            // console.log('Edited Page Saved')
            res.render('admin/editsuccess', {pageData, admin: req.session.username})
        })
    }
})

myApp.get('/admin/delete/:slug', (req, res) => {
    if (req.session.userLoggedIn) {
        const pageId = req.params.slug
        Page.findOne({slug:pageId}).exec()
        .then((page) => {
            if (page !== null) {
                Page.findOneAndDelete({slug: pageId}).exec()
                res.render('admin/delete', {message: "Page Successfully Deleted!" , admin: req.session.username})
            } else {
                res.render('admin/delete', {message: 'Sorry, could not delete!', admin: req.session.username})
            }
        })
    } else {
        // Page.find({}).exec()
        // .then((pages) => {
        // })
            res.redirect('/admin/login')
    }
})

myApp.get('/nav/:slug', async (req, res) => {
    const pageId = req.params.slug
    const page = await Page.findOne({slug: pageId}).exec()
    const allPages = await Page.find({}).exec()
    if (page !== null && allPages !== null) {
        res.render('page', {page: page, pages: allPages})
    } else {
        res.send('Sorry, the page you are looking for does not exist...')
    }
})


// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');
