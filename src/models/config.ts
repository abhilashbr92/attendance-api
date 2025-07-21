const mongoose = require("mongoose");

export const configSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Unique identifier for the config
    Config: { type: mongoose.Schema.Types.Mixed, required: true } // Mixed type for flexible configuration
});

const Config = mongoose.model("Config", configSchema, "Config");
export { Config };
