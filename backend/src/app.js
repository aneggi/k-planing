import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/falegnameria';
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Mongo connection error', err));

// Models
import './models/Person.js';
import './models/Customer.js';
import './models/Quotation.js';
import './models/Department.js';
import './models/OrderTemplate.js';
import './models/Order.js';
import './models/Status.js';
import './models/Assignment.js';
import './models/TodoTemplate.js';
import './models/Todo.js';

// Routes
import personRoutes from './routes/personRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import orderTemplateRoutes from './routes/orderTemplateRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import statusRoutes from './routes/statusRoutes.js';
import todoTemplateRoutes from './routes/todoTemplateRoutes.js';
import todoRoutes from './routes/todoRoutes.js';

app.use('/api/persons', personRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/order-templates', orderTemplateRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/todo-templates', todoTemplateRoutes);
app.use('/api/todos', todoRoutes);

const port = process.env.PORT || 4000;
app.get('/', (req, res) => res.send('Falegnameria Planner API running'));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
