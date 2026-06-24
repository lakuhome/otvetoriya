const express = require('express');
const cors = require('cors');

const { env } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const historyRoutes = require('./routes/history.routes');
const questionRoutes = require('./routes/question.routes');
const quizRoutes = require('./routes/quiz.routes');
const sessionRoutes = require('./routes/session.routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(
  cors({
    origin: env.clientUrl === '*' ? true : env.clientUrl,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
