const express = require("express");
const { recordFeedback } = require("../services/feedbackService");

const router = express.Router();

function handleRoute(handler) {
  return async (req, res, next) => {
    try {
      res.status(200).json(await handler(req));
    } catch (error) {
      next(error);
    }
  };
}

router.post(
  "/",
  handleRoute(async (req) => recordFeedback(req.body)),
);

module.exports = router;
