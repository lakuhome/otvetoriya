const express = require('express');

const { list } = require('../controllers/category.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', list);

module.exports = router;

