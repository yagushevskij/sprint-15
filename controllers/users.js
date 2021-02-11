const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const NotFoundError = require('../classes/NotFoundError');
const UnauthorizedError = require('../classes/UnauthorizedError');

const { NODE_ENV, JWT_SECRET } = process.env;

const getUsers = async (req, res, next) => {
  try {
    res.json(await User.find({}));
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await User.findById(req.user._id).orFail(new NotFoundError('Пользователь не найден'));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getUserByUsername = async (req, res, next) => {
  try {
    const result = await User.findOne({ username: req.params.username })
      .orFail(new NotFoundError('Пользователь не найден'));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const {
      avatar, email, name, username, about,
    } = req.body;
    const password = await bcrypt.hash(req.body.password, 10);
    const result = await User.createUser({
      name, username, about, avatar, email, password,
    });
    const token = jwt.sign({ _id: result._id }, NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret', { expiresIn: '365d' });
    res.send({ token, user: result });
  } catch (err) {
    next(err);
  }
};

const editProfile = async (req, res, next) => {
  try {
    const { name, about } = req.body;
    const result = await User.findByIdAndUpdate(req.user, {
      $set: {
        name, about,
      },
    }, {
      new: true,
    }).orFail(new NotFoundError('Пользователь не найден'));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    const result = await User.findByIdAndUpdate(req.user, { $set: { avatar: req.body.avatar } }, {
      new: true,
      runValidators: true,
    }).orFail(new NotFoundError('Пользователь не найден'));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password').orFail(new UnauthorizedError('Неверный логин или пароль'));
    const isPassCorrect = await bcrypt.compare(password, user.password);
    if (isPassCorrect) {
      const token = jwt.sign({ _id: user._id }, NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret', { expiresIn: '365d' });
      res.send({ token, user });
    } else {
      next(new UnauthorizedError('Неверный логин или пароль'));
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers, getUserById, getUserByUsername, createUser, editProfile, updateAvatar, login,
};
