import express from 'express';
import Assignment from '../models/Assignment.js';
import Person from '../models/Person.js';

const router = express.Router();

// List with optional week filter
router.get('/', async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start && end) {
      filter.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    const assignments = await Assignment.find(filter);
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { personId, personName } = req.body;
    let name = personName;
    if (!name && personId) {
      const person = await Person.findById(personId);
      if (person) name = `${person.name} ${person.surname || ''}`.trim();
    }
    const assignment = await Assignment.create({ ...req.body, personName: name });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
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
    const deleted = await Assignment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
