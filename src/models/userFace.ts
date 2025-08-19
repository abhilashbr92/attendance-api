const mongoose = require("mongoose");

export const UserFaceSchema = new mongoose.Schema({
    EId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true }, // Entity Id
    UserId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },        // User Id
    Embedding: { type: [Number], required: true }, // Face embedding vector
    ImgName: { type: String, required: true }, // Image file name
    CrAt: { type: Date, default: Date.now }, // Created at timestamp
    Del: { type: Boolean, default: false },
});
const UserFace = mongoose.model("UserFace", UserFaceSchema, "UserFace");
export { UserFace };