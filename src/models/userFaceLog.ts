const mongoose = require("mongoose");
export const UserFaceLogSchema = new mongoose.Schema({
    EId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true }, // Entity Id
    UserId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },        // User Id
    FaceId: { type: mongoose.Schema.ObjectId, ref: "UserFace", required: true }, // User Face Id
    LogTime: { type: Date, default: Date.now }, // Log timestamp
    Result: {
        Similarity: { type: Number, required: true }, // Similarity score of the face recognition
        SThreshold: { type: Number, required: true }, // Threshold for face recognition
        Liveness: { type: Number, required: true }, // Liveness check result
        LThreshold: { type: Number, required: true }, // Liveness threshold
    }
});
const UserFaceLog = mongoose.model("UserFaceLog", UserFaceLogSchema, "UserFaceLog");
export { UserFaceLog };