// middleware/validation.js
const Joi = require('joi');

// Validation schemas
const loginSchema = Joi.object({
  identifier: Joi.string().required()
});

const testRecordSchema = Joi.object({
  idNumber: Joi.string().required(),
  gender: Joi.string().valid('Male', 'Female', 'Other').required(),
  identifier: Joi.string().required(),
  numberPlate: Joi.string().required(),
  alcoholLevel: Joi.number().min(0).max(1.0).required(),
  location: Joi.string().required(),
  deviceSerial: Joi.string().required(),
  notes: Joi.string().optional().allow('')
});

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateLogin: validate(loginSchema),
  validateTestRecord: validate(testRecordSchema)
};