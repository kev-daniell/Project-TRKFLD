if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}



const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override')
const ejsMate = require('ejs-mate')
const Post = require('./models/posts');
const multer = require('multer')
const { storage, cloudinary } = require('./cloudinary/index')
const upload = multer({ storage })



const dbURL = process.env.DB_URL
// const dbURL = 'mongodb://localhost:27017/takehome'


mongoose.connect(dbURL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: false,
        family: 4
    })
    .then(() => {
        console.log('connection open')
    })
    .catch(e => {
        console.log('ERROR OCCURED', e)
    })


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.json())
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.engine('ejs', ejsMate);


//All the posting routes:
app.get('/', async (req, res) => {
    const posts = await Post.find()
    const length = posts.length - 1

    res.render('posts', { posts, length });
})


//form to make listing
app.get('/create', async (req, res) => {
    res.render('create');
})

//route to view a single listing
app.get('/posts/:id', async (req, res) => {
    const { id } = req.params;
    const currentPost = await Post.findById(id);
    if (!currentPost) {
        res.redirect('/');
    } else {
        res.render('show', { post: currentPost });
    }
})

//route to edit a single listing
app.get('/posts/:id/edit', async (req, res) => {
    const { id } = req.params;
    const currentPost = await Post.findById(id)
    if (!currentPost) {
        res.redirect('/');
    } else {
        res.render('edit', { post: currentPost })
    }
})


//updating a listing 
app.patch('/posts/:id', upload.array('image'), async (req, res) => {
    const { id } = req.params;
    const { title, text } = req.body;
    const currentPost = await Post.findByIdAndUpdate(id, { title, text }, { runValidators: true })

    const images = req.files.map(f => ({ url: f.path, filename: f.filename }))
    currentPost.image.push(...images)
    await currentPost.save()
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename)
        }
        await currentPost.updateOne({ $pull: { image: { filename: { $in: req.body.deleteImages } } } })
    }

    res.redirect(`/posts/${id}`)
})


//making new listing 
app.post('/posts', upload.array('image'), async (req, res) => {
    const { title, text } = req.body;
    const author = "Test User"
    const newPost = new Post({ author, title, text })
    newPost.image = req.files.map(f => ({ url: f.path, filename: f.filename }))
    await newPost.save()
    res.redirect('/')
})


const port = process.env.PORT

app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})