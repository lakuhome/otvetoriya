const { query } = require('../db/pool');

async function list(req, res, next) {
  try {
    const result = await query(
      `
        SELECT id, name
        FROM categories
        ORDER BY name ASC, id ASC
      `
    );

    res.json({
      categories: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
};

