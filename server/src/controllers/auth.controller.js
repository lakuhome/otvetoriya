const { registerUser, loginUser } = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const result = await registerUser({
      email: req.body.email,
      password: req.body.password,
      displayName: req.body.displayName,
      role: req.body.role,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await loginUser({
      email: req.body.email,
      password: req.body.password,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  me,
};

