import express from 'express';
import Order from '../models/Order.js';
import OrderTemplate from '../models/OrderTemplate.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

const applyMediumTermPlan = (stages, dueDate, medium) => {
  if (!medium || !dueDate || !stages.length) return stages;
  let referenceEnd = new Date(dueDate);
  const ordered = [...stages].sort((a, b) => (b.orderBy || 0) - (a.orderBy || 0));
  const computed = [];
  for (const stage of ordered) {
    const durationDays = Math.max(1, Math.ceil((Number(stage.estimateHours) || 0) / 8));
    const stageEnd = stage.dueDate ? new Date(stage.dueDate) : new Date(referenceEnd);
    const stageStart = new Date(stageEnd);
    stageStart.setDate(stageStart.getDate() - durationDays + 1);
    computed.unshift({
      ...stage,
      dueDate: stage.dueDate || stageEnd,
      startDate: stageStart,
    });
    referenceEnd = new Date(stageStart);
  }
  return computed;
};

router.post('/', async (req, res, next) => {
  try {
    const { templateId, ...payload } = req.body;
    const totalHours = Number(payload.estimateHours) || 0;
    let stages = payload.stages || [];

    if (templateId) {
      const template = await OrderTemplate.findById(templateId);
      if (template) {
        stages = template.stages.map((stage) => {
          // Clone the stage to avoid mutating the template document
          const data = stage.toObject ? { ...stage.toObject() } : { ...stage };
          const pct = Number(data.percentageOfWork) || 0;
          data.estimateHours = Math.round((pct / 100) * totalHours);
          return data;
        });
      }
    }

    const computedStages = applyMediumTermPlan(stages, payload.dueDate, payload.mediumTermPlan);
    const order = await Order.create({ ...payload, templateId, stages: computedStages });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { estimateHours, stages = [], ...rest } = req.body;
    const totalHours = Number(estimateHours) || 0;
    const enrichedStages = stages.map((s) => {
      const pct = Number(s.percentageOfWork) || 0;
      return { ...s, estimateHours: Math.round((pct / 100) * totalHours) };
    });

    const computedStages = applyMediumTermPlan(enrichedStages, rest.dueDate, rest.mediumTermPlan);
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { ...rest, estimateHours, stages: computedStages },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
