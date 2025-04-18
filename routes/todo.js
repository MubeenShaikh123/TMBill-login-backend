import express from 'express';
import Todo from '../models/Todo.js';
import protect from '../middleware/auth.js';

const router = express.Router();
const requireLogin = protect;

// GET all todos for logged-in user
router.get('/', requireLogin, async (req, res) => {
    try {
        const todos = await Todo.find({ userId: req._id }).sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

// POST create a new todo
router.post('/', requireLogin, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Todo text is required' });

    try {
        const todo = new Todo({
            userId: req._id,
            text,
            completed: false,
        });
        await todo.save();
        res.status(201).json(todo);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create todo' });
    }
});

// PUT update a todo by ID
router.put('/:id', requireLogin, async (req, res) => {
    const { text, completed } = req.body;
    const { id } = req.params;

    try {
        const updatedTodo = await Todo.findOneAndUpdate(
            { _id: id, userId: req._id },
            { text, completed },
            { new: true }
        );

        if (!updatedTodo) {
            return res.status(404).json({ error: 'Todo not found or unauthorized' });
        }

        res.json(updatedTodo);
    } catch (err) {
        console.error('Error updating todo:', err);
        res.status(500).json({ error: 'Failed to update todo' });
    }
});

// DELETE a todo by ID
router.delete('/:id', requireLogin, async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await Todo.findOneAndDelete({ _id: id, userId: req._id });

        if (!deleted) {
            return res.status(404).json({ error: 'Todo not found or unauthorized' });
        }

        res.json({ message: 'Todo deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete todo' });
    }
});

export default router;
