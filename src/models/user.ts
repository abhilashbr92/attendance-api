const mongoose = require("mongoose");

export const UserSchema = new mongoose.Schema({
    EId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    Name: { type: String, required: true },
    UName: { type: String, required: true, unique: true, index: true },
    Pwd: { type: String, required: true, select: false },
    Admin: { type: Boolean, default: false },
    FaceReg: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema, "User");
export { User };