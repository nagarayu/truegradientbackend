const mongoose = require("mongoose");
const responseSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  result_text: {
    type: String,
    required: true,
  },
  result_table: {
    type: String,
  },
  result_viz: {
    type: String,
  },
  error: {
    type: String,
  },
});

module.exports = mongoose.model("Response", responseSchema);
