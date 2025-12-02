require('dotenv').config();
require('pg');
const express = require('express');
const path = require('path');
const session = require('client-sessions');

// MongoDB
const { connectDB } = require('./config/db');
connectDB(); // Connect to MongoDB

// PostgreSQL
const { sequelize, connectPostgres } = require('./config/postgres');
connectPostgres();

// Models
const User = require('./models/User');
const Task = require('./models/Task'); // Task model

const app = express();
const PORT = process.env.PORT || 3000;


function ensureLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

function ensureLogout(req, res, next) {
    if (req.session.user) return res.redirect('/dashboard');
    next();
}

// MIDDLEWARE 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    cookieName: 'session',
    secret: process.env.SESSION_SECRET,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));

// ROUTES
app.get('/', (req, res) => res.render('home'));
app.get('/login', ensureLogout, (req, res) => res.render('login'));
app.get('/register', ensureLogout, (req, res) => res.render('register'));

//  REGISTER 
app.post('/register', ensureLogout, async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.render('register', { message: 'All fields are required.' });

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.render('register', { message: 'Username or email already exists.' });

        const newUser = new User({ username, email, password });
        await newUser.save();

        req.session.user = { id: newUser._id, username: newUser.username, email: newUser.email };
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('register', { message: 'An error occurred. Please try again.' });
    }
});

//  LOGIN 
app.post('/login', ensureLogout, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.render('login', { message: 'Both fields are required.' });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.render('login', { message: 'Invalid username or password.' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.render('login', { message: 'Invalid username or password.' });

        req.session.user = { id: user._id, username: user.username, email: user.email };
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { message: 'An error occurred. Please try again.' });
    }
});

// DASHBOARD 
app.get('/dashboard', ensureLogin, async (req, res) => {
    try {
        let tasks = await Task.findAll({
            where: { userId: req.session.user.id },
            order: [['createdAt', 'DESC']]
        });

        // Convert dueDate to Date object if not null
        tasks = tasks.map(task => {
            const t = task.toJSON();
            t.dueDate = t.dueDate ? new Date(t.dueDate) : null;
            return t;
        });

        res.render('dashboard', { user: req.session.user, tasks });
    } catch (err) {
        console.error(err);
        res.render('dashboard', { user: req.session.user, tasks: [], message: 'Error fetching tasks.' });
    }
});


// ADD TASK 
app.get('/tasks/add', ensureLogin, (req, res) => {
    res.render('addTask', { user: req.session.user, message: null });
});

app.post('/tasks/add', ensureLogin, async (req, res) => {
    const { title, description, dueDate, status } = req.body;
    if (!title) return res.render('addTask', { user: req.session.user, message: 'Title is required.' });

    try {
        console.log('Session user:', req.session.user);
        await Task.create({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: status || 'pending',
            userId: req.session.user.id
        });
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error adding task:', err.errors || err.message || err);
        res.render('addTask', { user: req.session.user, message: 'Error adding task. Please try again.' });
    }
});

// Render edit task form
app.get('/tasks/edit/:id', ensureLogin, async (req, res) => {
    const taskId = req.params.id;

    try {
        const task = await Task.findOne({
            where: { id: taskId, userId: req.session.user.id } // ensuring that user owns the task
        });

        if (!task) {
            return res.redirect('/dashboard'); // task not found or not owned by user
        }

        res.render('editTask', { user: req.session.user, task, message: null });
    } catch (err) {
        console.error('Error fetching task for edit:', err);
        res.redirect('/dashboard');
    }
});

// Handle edit task submission
app.post('/tasks/edit/:id', ensureLogin, async (req, res) => {
    const { title, description, dueDate, status } = req.body;
    const taskId = req.params.id;

    try {
        const task = await Task.findByPk(taskId);
        if (!task) return res.redirect('/dashboard');

        await task.update({
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : null,
            status
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error updating task:', err);
        res.render('editTask', { task: { id: taskId, title, description, dueDate, status }, user: req.session.user, message: 'Error updating task. Please try again.' });
    }
});

// Mark task as completed
app.post('/tasks/complete/:id', ensureLogin, async (req, res) => {
    const taskId = req.params.id;

    try {
        const task = await Task.findOne({
            where: { id: taskId, userId: req.session.user.id }
        });

        if (!task) return res.redirect('/dashboard');

        await task.update({ status: 'completed' });

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error marking task as completed:', err);
        res.redirect('/dashboard');
    }
});

// Delete a task
app.get('/tasks/delete/:id', ensureLogin, async (req, res) => {
    const taskId = req.params.id;

    try {
        // find the task and ensure it belongs to the logged-in user
        const task = await Task.findOne({
            where: { id: taskId, userId: req.session.user.id }
        });

        if (!task) {
            return res.redirect('/dashboard'); // task not found or not owned by user
        }

        await task.destroy(); // delete task
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error deleting task:', err);
        res.redirect('/dashboard');
    }
});


// LOGOUT 
app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/login');
});


//  SERVER 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
