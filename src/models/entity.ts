const mongoose = require("mongoose");

export const EntitySchema = new mongoose.Schema({
    Name: { type: String, required: true },
    EName: { type: String, required: true, unique: true, index: true }, // Entity username/identifier
}, { timestamps: true });

const Entity = mongoose.model("Entity", EntitySchema, "Entity");
export { Entity };