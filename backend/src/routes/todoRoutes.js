import express from 'express';
import Todo from '../models/Todo.js';
import TodoTemplate from '../models/TodoTemplate.js';

const router = express.Router();

const cloneTemplate = (template) => {
  return (template.subTodos || []).map((sub) => ({
    description: sub.description,
    checks: (sub.checks || []).map((check) => ({ ...check })),
    assignedTo: sub.assignedTo,
    assignedToName: sub.assignedToName,
  }));
};

router.get('/', async (req, res, next) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { templateId, ...payload } = req.body;
    let subTodos = payload.subTodos || [];
    if (templateId) {
      const template = await TodoTemplate.findById(templateId);
      if (template) {
        subTodos = cloneTemplate(template);
      }
    }
    const todo = await Todo.create({ ...payload, templateId, subTodos });
    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await Todo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Todo.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
